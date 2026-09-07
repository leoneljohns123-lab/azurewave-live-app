
'use client';

import React, { useRef, useEffect, forwardRef } from 'react';

interface PaintCanvasProps {
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  tool: 'pencil' | 'eraser';
}

export const PaintCanvas = forwardRef<HTMLCanvasElement, PaintCanvasProps>(
  ({ width, height, color, lineWidth, tool }, ref) => {
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
      const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          context.lineCap = 'round';
          context.lineJoin = 'round';
          contextRef.current = context;
        }
      }
    }, [ref]);

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
            contextRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }, [color, lineWidth, tool]);

    const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
      const { offsetX, offsetY } = nativeEvent;
      if (contextRef.current) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        isDrawing.current = true;
      }
    };

    const finishDrawing = () => {
      if (contextRef.current) {
        contextRef.current.closePath();
        isDrawing.current = false;
      }
    };

    const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) {
        return;
      }
      const { offsetX, offsetY } = nativeEvent;
      if (contextRef.current) {
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
      }
    };

    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        onMouseLeave={finishDrawing}
        className="bg-white rounded-md cursor-crosshair"
      />
    );
  }
);

PaintCanvas.displayName = 'PaintCanvas';
