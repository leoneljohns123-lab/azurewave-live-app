
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faEraser,
  faFillDrip,
  faSlash,
  faFont,
  faPalette,
  faUndo,
  faRedo,
  faTrashAlt,
  faWrench,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { faSquare, faCircle } from '@fortawesome/free-regular-svg-icons';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

interface PaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dataUrl: string) => void;
}

const palette = [
    '#000000','#1f2937','#374151','#6b7280','#9ca3af','#d1d5db','#ffffff',
    '#ef4444','#f97316','#f59e0b','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#2563eb','#6366f1','#7c3aed','#a855f7','#ec4899',
    '#ff007f','#ff00ff','#00ffff','#00ff9f','#00ff00','#7cff00','#ffea00','#ff8c00','#ff3b3b','#8b00ff'
];

type Tool = 'pen' | 'eraser' | 'fill' | 'line' | 'rect' | 'circle' | 'text';

export function PaintDialog({ open, onOpenChange, onSave }: PaintDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const historyIndex = useRef(-1);
  
  const [mode, setMode] = useState<Tool>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<'stroke' | 'fill'>('stroke');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [wasFilled, setWasFilled] = useState(false);
  
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (
            isToolsMenuOpen &&
            toolsMenuRef.current &&
            !toolsMenuRef.current.contains(event.target as Node) &&
            toolsToggleRef.current &&
            !toolsToggleRef.current.contains(event.target as Node)
        ) {
            setIsToolsMenuOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsMenuOpen]);


  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (historyIndex.current < history.current.length - 1) {
      history.current.splice(historyIndex.current + 1);
    }
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    historyIndex.current = history.current.length - 1;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      const existingData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        if (existingData) {
          ctx.putImageData(existingData, 0, 0);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
        setIsToolsMenuOpen(false);
        setMode('pen');
        setStrokeColor('#000000');
        setFillColor('#ffffff');
        setLineWidth(6);
        setOpacity(1);
        history.current = [];
        historyIndex.current = -1;
        setWasFilled(false);
        
        setTimeout(() => {
            resizeCanvas();
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                saveHistory();
            }
        }, 0);
    }
  }, [open, resizeCanvas, saveHistory]);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    setStartPos({ x, y });

    if (mode === 'fill') {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.restore();
      setWasFilled(true);
      saveHistory();
      return;
    }

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = mode === 'eraser' ? '#ffffff' : strokeColor;
    ctx.lineWidth = lineWidth;

    if (mode === 'pen' || mode === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !startPos) return;
    const { x, y } = getCoords(e);
    
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = lineWidth;

    if (mode === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if (mode === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    }
    if (mode === 'circle') {
      const radius = Math.hypot(x - startPos.x, y - startPos.y);
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    setIsDrawing(false);
    ctx.closePath();
    saveHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        // If fill tool was NOT used, draw a white background
        if (!wasFilled) {
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        // Draw the user's drawing on top
        tempCtx.drawImage(canvas, 0, 0);

        onSave(tempCanvas.toDataURL('image/png'));
      } else {
         onSave(canvas.toDataURL('image/png'));
      }
      
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setWasFilled(false);
      saveHistory();
    }
  };

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(history.current[historyIndex.current], 0, 0);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(history.current[historyIndex.current], 0, 0);
      }
    }
  };

  const handleText = () => {
    const text = prompt('Enter text:');
    const ctx = canvasRef.current?.getContext('2d');
    if (text && ctx && startPos) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = strokeColor;
        ctx.font = `${Math.max(12, lineWidth * 3)}px sans-serif`;
        ctx.fillText(text, startPos.x, startPos.y);
        ctx.restore();
        saveHistory();
    }
  };
  
  const handleToolClick = (tool: Tool) => {
    setMode(tool);
    if (tool !== 'text') {
      setIsToolsMenuOpen(false);
    }
  }

  const ColorPicker = (
    <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none">
        <div className="pnt-color-panel">
            <div className="flex gap-2 mb-2.5">
                <button
                    className={cn('pnt-tab', activeColorTab === 'stroke' && 'active')}
                    onClick={() => setActiveColorTab('stroke')}>Stroke</button>
                <button
                    className={cn('pnt-tab', activeColorTab === 'fill' && 'active')}
                    onClick={() => setActiveColorTab('fill')}>Fill</button>
            </div>
            <div className="pnt-colors">
                {palette.map(c => (
                    <button
                        key={c}
                        className="pnt-swatch"
                        style={{ background: c }}
                        onClick={() => {
                            if (activeColorTab === 'stroke') setStrokeColor(c);
                            else setFillColor(c);
                            setIsColorModalOpen(false);
                        }}
                    />
                ))}
            </div>
        </div>
    </PopoverContent>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pnt-dialog bg-background/50 backdrop-blur-sm border">
        <DialogTitle className="sr-only">PaintIt Drawing Dialog</DialogTitle>
        <div className="pnt-dialog-header">
          <h3>PaintIt – Draw</h3>
        </div>

        <div className="pnt-toolbar-collapsed">
            <div className="flex items-center justify-between gap-2">
                <Button ref={toolsToggleRef} variant="ghost" className="pnt-tool gap-2 !w-auto px-3" onClick={() => setIsToolsMenuOpen(prev => !prev)}>
                    <FontAwesomeIcon icon={faWrench} /> Tools
                </Button>
                
                <div className="flex-grow" />

                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="pnt-tool" title="Undo" onClick={handleUndo}><FontAwesomeIcon icon={faUndo} /></Button>
                  <Button variant="ghost" className="pnt-tool" title="Redo" onClick={handleRedo}><FontAwesomeIcon icon={faRedo} /></Button>
                  <Button variant="ghost" className="pnt-tool" title="Clear" onClick={handleClear}><FontAwesomeIcon icon={faTrashAlt} /></Button>
                </div>
            </div>
            
             <div ref={toolsMenuRef} className={cn("pnt-tools-menu", isToolsMenuOpen && "open")}>
                <Button variant="ghost" className={cn('pnt-tool', mode === 'pen' && 'active')} title="Pen" onClick={() => handleToolClick('pen')}><FontAwesomeIcon icon={faPencil} /></Button>
                <Button variant="ghost" className={cn('pnt-tool', mode === 'eraser' && 'active')} title="Eraser" onClick={() => handleToolClick('eraser')}><FontAwesomeIcon icon={faEraser} /></Button>
                <div className="pnt-divider" />
                <Button variant="ghost" className={cn('pnt-tool', mode === 'line' && 'active')} title="Line" onClick={() => handleToolClick('line')}><FontAwesomeIcon icon={faSlash} /></Button>
                <Button variant="ghost" className={cn('pnt-tool', mode === 'rect' && 'active')} title="Rectangle" onClick={() => handleToolClick('rect')}><FontAwesomeIcon icon={faSquare} /></Button>
                <Button variant="ghost" className={cn('pnt-tool', mode === 'circle' && 'active')} title="Circle" onClick={() => handleToolClick('circle')}><FontAwesomeIcon icon={faCircle} /></Button>
                <Button variant="ghost" className={cn('pnt-tool', mode === 'text' && 'active')} title="Text" onClick={() => { handleToolClick('text'); handleText(); }}><FontAwesomeIcon icon={faFont} /></Button>
                 <div className="pnt-divider" />
                <Button variant="ghost" className={cn('pnt-tool', mode === 'fill' && 'active')} title="Fill" onClick={() => handleToolClick('fill')}><FontAwesomeIcon icon={faFillDrip} /></Button>
                <Popover open={isColorModalOpen} onOpenChange={setIsColorModalOpen}>
                    <PopoverTrigger asChild>
                         <Button variant="ghost" className="pnt-tool w-10" style={{ backgroundColor: strokeColor }} title="Color" />
                    </PopoverTrigger>
                    {ColorPicker}
                </Popover>

                <div className="pnt-divider" />

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60">
                    <Label htmlFor="size-slider" className="text-xs text-slate-400 pl-1">Size</Label>
                    <Slider id="size-slider" value={[lineWidth]} onValueChange={(v) => setLineWidth(v[0])} min={1} max={50} step={1} className="w-24" />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60">
                    <Label htmlFor="opacity-slider" className="text-xs text-slate-400 pl-1">Opacity</Label>
                    <Slider id="opacity-slider" value={[opacity]} onValueChange={(v) => setOpacity(v[0])} min={0.1} max={1} step={0.1} className="w-24" />
                </div>
            </div>
        </div>

        <div className="pnt-canvas-wrap">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="pnt-dialog-footer">
            <Button
                className="font-semibold bg-[#8A2BE2] hover:bg-[#7f26d0] text-white rounded-lg"
                onClick={handleSave}
            >
                <FontAwesomeIcon icon={faPaperPlane} />
                Send
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
