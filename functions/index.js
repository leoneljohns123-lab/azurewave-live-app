const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();

const db = admin.firestore();

const LOOKUP_LIMIT = 20; // max lookups
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

exports.deleteUser = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated.");
    }

    const callerId = context.auth.uid;
    const callerSnap = await db.collection("users").doc(callerId).get();

    if (!callerSnap.exists || callerSnap.data().role !== 'Owner') {
        throw new functions.https.HttpsError("permission-denied", "You do not have permission to perform this action.");
    }

    const targetUserId = data.userId;
    if (!targetUserId) {
        throw new functions.https.HttpsError("invalid-argument", "A target user ID must be provided.");
    }

    if (callerId === targetUserId) {
        throw new functions.https.HttpsError("invalid-argument", "You cannot delete your own account.");
    }

    try {
        // --- Firestore Data Deletion ---
        
        // 1. Delete user's main document and subcollections
        const userRef = db.collection('users').doc(targetUserId);
        const subcollections = ['notifications', 'ratings', 'profileNotes', 'private'];
        for (const sub of subcollections) {
            await deleteCollection(db, `users/${targetUserId}/${sub}`, 100);
        }
        
        // 2. Delete user's posts (and their comments/likes subcollections)
        const postsQuery = db.collection('posts').where('authorId', '==', targetUserId);
        const postsSnapshot = await postsQuery.get();
        if (!postsSnapshot.empty) {
            const batch = db.batch();
            for (const postDoc of postsSnapshot.docs) {
                batch.delete(postDoc.ref);
                // Also delete subcollections of posts
                await deleteCollection(db, `posts/${postDoc.id}/comments`, 100);
            }
            await batch.commit();
        }

        // 3. Delete user's comments on other people's posts (Collection Group Query)
        // Note: This requires a composite index for collection group 'comments'.
        // If it fails, we catch it gracefully.
        try {
            const commentsQuery = db.collectionGroup('comments').where('authorId', '==', targetUserId);
            const commentsSnapshot = await commentsQuery.get();
            if (!commentsSnapshot.empty) {
                const batch = db.batch();
                commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (e) {
            console.warn("Collection group deletion failed (likely missing index):", e.message);
        }

        // 4. Delete user's presence in squares
        const userSquaresQuery = db.collection('userSquares').where('userId', '==', targetUserId);
        const userSquaresSnapshot = await userSquaresQuery.get();
        if (!userSquaresSnapshot.empty) {
            const batch = db.batch();
            userSquaresSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 5. Delete user's friend requests
        const friendRequestsSentQuery = db.collection('friendRequests').where('senderId', '==', targetUserId);
        const friendRequestsReceivedQuery = db.collection('friendRequests').where('receiverId', '==', targetUserId);
        const [sentSnapshot, receivedSnapshot] = await Promise.all([friendRequestsSentQuery.get(), friendRequestsReceivedQuery.get()]);
        
        const frBatch = db.batch();
        sentSnapshot.docs.forEach(doc => frBatch.delete(doc.ref));
        receivedSnapshot.docs.forEach(doc => frBatch.delete(doc.ref));
        await frBatch.commit();

        // It is now safe to delete the main user document
        await userRef.delete();

        // --- Auth Deletion ---
        await admin.auth().deleteUser(targetUserId);

        return { success: true, message: `User ${targetUserId} has been deleted successfully.` };

    } catch (error) {
        console.error(`Failed to delete user ${targetUserId}:`, error);
        throw new functions.https.HttpsError("internal", `Could not complete user deletion. ${error.message}`);
    }
});


exports.lookupUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be authenticated to call this function.");
  }

  const staffId = context.auth.uid;
  
  try {
    const staffSnap = await db.collection("users").doc(staffId).get();
    
    if (!staffSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "Caller user profile not found.");
    }
    const staffData = staffSnap.data();

    // Role check
    const isOwner = staffData.role === "Owner";
    const hasStaffPermission = ["Owner", "Co-Owner", "Super Admin", "Admin", "Moderator"].includes(staffData.role);

    if (!hasStaffPermission) {
        throw new functions.https.HttpsError("permission-denied", "You do not have permission to perform this action.");
    }

    const targetUserId = String(data.targetUserId || "").trim();
    if (!targetUserId) {
        throw new functions.https.HttpsError("invalid-argument", "A target user ID must be provided.");
    }

    // Rate Limiting
    const rateRef = db.collection("rate_limits").doc(staffId);
    await db.runTransaction(async (transaction) => {
        const rateSnap = await transaction.get(rateRef);
        const now = Date.now();

        if (rateSnap.exists) {
            const { count, windowStart } = rateSnap.data();
            const startMillis = windowStart?.toMillis ? windowStart.toMillis() : now;
            if (now - startMillis < WINDOW_MS) {
                if (count >= LOOKUP_LIMIT) {
                    throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
                }
                transaction.update(rateRef, { count: admin.firestore.FieldValue.increment(1) });
            } else {
                transaction.set(rateRef, { count: 1, windowStart: admin.firestore.Timestamp.now() });
            }
        } else {
            transaction.set(rateRef, { count: 1, windowStart: admin.firestore.Timestamp.now() });
        }
    });

    // Fetch target data
    const userRef = db.collection("users").doc(targetUserId);
    const userPrivateRef = userRef.collection("private").doc("data");

    const [userSnap, userPrivateSnap] = await Promise.all([
        userRef.get(),
        isOwner ? userPrivateRef.get() : Promise.resolve(null)
    ]);

    if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "The target user does not exist.");
    }
    const user = userSnap.data();
    const userPrivate = userPrivateSnap?.exists ? userPrivateSnap.data() : null;

    // Correlation
    let otherAccounts = [];
    if (userPrivate && userPrivate.ipHash) {
        const sameHashQuery = await db
            .collectionGroup("private")
            .where("ipHash", "==", userPrivate.ipHash)
            .limit(50)
            .get();
            
        const userIds = sameHashQuery.docs
            .map(doc => doc.ref.parent.parent.id)
            .filter(id => id !== targetUserId);
        
        if(userIds.length > 0) {
            const usersQuery = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', userIds).get();
            usersQuery.forEach(doc => {
                if (!doc.data().isBot) {
                    otherAccounts.push({
                        userId: doc.id,
                        username: doc.data().username
                    });
                }
            });
        }
    }

    // Name History
    const oldNamesSnap = await db
        .collection("username_history")
        .where("userId", "==", targetUserId)
        .orderBy("changedAt", "desc")
        .limit(50)
        .get();
    const oldNames = oldNamesSnap.docs.map(d => d.data().username);

    // Audit
    await db.collection("audit_logs").add({
        staffId,
        staffName: staffData.username,
        targetUserId,
        action: isOwner ? "OWNER_LOOKUP" : "STAFF_LOOKUP",
        reason: "profile_lookup",
        ipHashUsed: userPrivate?.ipHash || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const response = {
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        email: user.email || null,
        otherAccounts,
        oldNames,
        disclaimer: "Correlation data is for moderation aid only."
    };
    
    if (isOwner) {
        response.rawIp = userPrivate?.rawIp || null;
    }
    
    return response;
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("Lookup user failed:", err);
    throw new functions.https.HttpsError("internal", err.message || "An internal error occurred.");
  }
});

exports.recordUserLogin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be authenticated to call this function.");
  }
  
  const userId = context.auth.uid;
  const ip = context.rawRequest ? context.rawRequest.ip : null;

  const userRef = db.collection("users").doc(userId);
  const userPrivateRef = userRef.collection("private").doc("data");

  try {
    const batch = db.batch();
    
    if (ip) {
        let salt = "a-very-strong-default-secret-salt-replace-me";
        try {
            // Safe access to config
            if (functions.config().auth && functions.config().auth.salt) {
                salt = functions.config().auth.salt;
            }
        } catch (e) {
            // config() can fail in certain environments
        }
        
        const ipHash = crypto.createHmac("sha256", salt).update(ip).digest("hex");
        batch.set(userPrivateRef, { rawIp: ip, ipHash: ipHash }, { merge: true });
    }

    batch.set(userRef, { lastSeen: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    return { success: true, message: "User login recorded." };
  } catch (error) {
    console.error(`Failed to record login for user ${userId}:`, error);
    // We don't want to break the whole app if this fails, but we want to return a clean response
    return { success: false, message: "Internal update failed." };
  }
});
