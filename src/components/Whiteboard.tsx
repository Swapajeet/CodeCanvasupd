import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Line, Transformer, RegularPolygon, Text } from 'react-konva';
import socket from '../lib/socket';
import { 
  Trash2, 
  Pen, 
  MousePointer2, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Diamond,
  Triangle,
  Undo2,
  Redo2
} from 'lucide-react';
import { nanoid } from 'nanoid';

const SNAP_SIZE = 20;

interface WhiteboardProps {
  roomId: string;
}

type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'text';

interface CanvasElement {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  fill?: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  rotation?: number;
}

export default function Whiteboard({ roomId }: WhiteboardProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [future, setFuture] = useState<CanvasElement[][]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Handle resizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          if (selectedId) {
            setElements(prev => prev.filter(el => el.id !== selectedId));
            socket.emit('canvas-element-delete', { roomId, elementId: selectedId });
            setSelectedId(null);
          }
          break;
        case 'escape':
          setSelectedId(null);
          setTool('select');
          break;
        case 'v': setTool('select'); break;
        case 'p': setTool('pencil'); break;
        case 'r': setTool('rectangle'); break;
        case 'c': setTool('circle'); break;
        case 'd': setTool('diamond'); break;
        case 't': setTool('triangle'); break;
        case 'x': setTool('text'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, roomId]);

  // Socket sync
  useEffect(() => {
    socket.on('room-init', ({ canvas }) => {
      if (canvas) setElements(canvas);
    });

    socket.on('canvas-update', (updatedElement: CanvasElement) => {
      setElements((prev) => {
        const index = prev.findIndex((el) => el.id === updatedElement.id);
        if (index === -1) return [...prev, updatedElement];
        const newElements = [...prev];
        newElements[index] = updatedElement;
        return newElements;
      });
    });

    socket.on('canvas-element-delete', (updatedId: string) => {
      setElements((prev) => prev.filter(el => el.id !== updatedId));
      if (selectedId === updatedId) setSelectedId(null);
    });

    socket.on('canvas-cleared', () => {
      setElements([]);
    });

    return () => {
      socket.off('canvas-update');
      socket.off('canvas-cleared');
    };
  }, []);

  // History Management
  const pushToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => [...prev, elements]);
    setFuture([]);
    setElements(newElements);
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setFuture(prev => [elements, ...prev]);
    setHistory(newHistory);
    setElements(previous);
    
    // Sync with server - this is a bit heavy but works for simple consistency
    // Ideally we'd have a full state sync event
    socket.emit('canvas-change-bulk', { roomId, elements: previous });
  }, [history, elements, roomId]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setHistory(prev => [...prev, elements]);
    setFuture(newFuture);
    setElements(next);
    
    socket.emit('canvas-change-bulk', { roomId, elements: next });
  }, [future, elements, roomId]);

  const handleMouseDown = useCallback((e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const id = nanoid();

    const snapX = Math.round(pos.x / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.round(pos.y / SNAP_SIZE) * SNAP_SIZE;

    let newElement: CanvasElement;

    if (tool === 'pencil') {
      newElement = {
        id,
        type: 'pencil',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        stroke: color,
        strokeWidth,
      };
    } else if (tool === 'text') {
      newElement = {
        id,
        type: 'text',
        x: snapX,
        y: snapY,
        text: 'Hello World',
        stroke: color,
        strokeWidth: 1,
        fill: color,
      };
    } else {
      newElement = {
        id,
        type: tool,
        x: snapX,
        y: snapY,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth,
        fill: 'transparent',
      };
    }

    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
    
  }, [tool, color, strokeWidth]);

  const handleMouseMove = useCallback((e: any) => {
    if (tool === 'select' || !selectedId) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    setElements((prev) => {
      const index = prev.findIndex((el) => el.id === selectedId);
      if (index === -1) return prev;

      const element = { ...prev[index] };

      if (element.type === 'pencil' && element.points) {
        element.points = [...element.points, pos.x, pos.y];
      } else {
        const snapX = Math.round(pos.x / SNAP_SIZE) * SNAP_SIZE;
        const snapY = Math.round(pos.y / SNAP_SIZE) * SNAP_SIZE;
        element.width = snapX - element.x;
        element.height = snapY - element.y;
      }

      const next = [...prev];
      next[index] = element;
      return next;
    });
  }, [selectedId, tool]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'select' || !selectedId) return;

    const finalElement = elements.find(el => el.id === selectedId);
    if (finalElement) {
      setHistory(prev => [...prev, elements.filter(el => el.id !== selectedId)]);
      setFuture([]);
      socket.emit('canvas-change', { roomId, drawingData: finalElement });
    }
    
    if (tool !== 'pencil') {
      setTool('select');
    } else {
      setSelectedId(null);
    }
  }, [selectedId, elements, tool, roomId]);

  const handleTransformEnd = useCallback((e: any) => {
    const node = e.target;
    const id = node.id();
    
    setElements((prev) => {
      const index = prev.findIndex((el) => el.id === id);
      if (index === -1) return prev;
      
      const element = { ...prev[index] };
      const oldElement = prev[index];

      element.x = Math.round(node.x() / SNAP_SIZE) * SNAP_SIZE;
      element.y = Math.round(node.y() / SNAP_SIZE) * SNAP_SIZE;
      element.rotation = node.rotation();
      
      if (element.type !== 'pencil') {
        element.width = Math.round((node.width() * node.scaleX()) / SNAP_SIZE) * SNAP_SIZE;
        element.height = Math.round((node.height() * node.scaleY()) / SNAP_SIZE) * SNAP_SIZE;
        node.scaleX(1);
        node.scaleY(1);
        node.x(element.x);
        node.y(element.y);
        node.width(element.width);
        node.height(element.height);
      }
      
      setHistory(h => [...h, prev]);
      setFuture([]);
      socket.emit('canvas-change', { roomId, drawingData: element });
      
      const next = [...prev];
      next[index] = element;
      return next;
    });
  }, [roomId]);

  const handleDragEnd = useCallback((e: any) => {
    const id = e.target.id();
    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;

    const snapX = Math.round(e.target.x() / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.round(e.target.y() / SNAP_SIZE) * SNAP_SIZE;

    const oldElements = [...elements];
    const element = { ...elements[index], x: snapX, y: snapY };
    e.target.x(snapX);
    e.target.y(snapY);

    setHistory(h => [...h, oldElements]);
    setFuture([]);
    socket.emit('canvas-change', { roomId, drawingData: element });
    
    setElements(prev => {
      const next = [...prev];
      next[index] = element;
      return next;
    });
  }, [elements, roomId]);

  const clearCanvas = () => {
    setHistory(h => [...h, elements]);
    setFuture([]);
    setElements([]);
    socket.emit('canvas-clear', roomId);
  };

  useEffect(() => {
    if (tool === 'select' && selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, tool]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleTextDblClick = useCallback((id: string) => {
    if (tool === 'select') {
      setEditingId(id);
    }
  }, [tool]);

  const handleTextChange = useCallback((id: string, text: string) => {
    setElements((prev) => {
      const index = prev.findIndex((el) => el.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = { ...next[index], text };
      socket.emit('canvas-change', { roomId, drawingData: next[index] });
      return next;
    });
  }, [roomId]);

  const renderElement = (el: CanvasElement) => {
    if (el.id === editingId && el.type === 'text') return null;

    const commonProps = {
      id: el.id,
      x: el.x,
      y: el.y,
      rotation: el.rotation || 0,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      draggable: tool === 'select' && editingId !== el.id,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      onClick: () => tool === 'select' && setSelectedId(el.id),
      onTap: () => tool === 'select' && setSelectedId(el.id),
    };

    switch (el.type) {
      case 'rectangle':
        return <Rect key={el.id} {...commonProps} width={el.width} height={el.height} fill={el.fill} />;
      case 'circle':
        return <Circle key={el.id} {...commonProps} radius={Math.abs(el.width || 0) / 2} fill={el.fill} />;
      case 'pencil':
        return <Line key={el.id} {...commonProps} points={el.points} tension={0.5} lineCap="round" lineJoin="round" />;
      case 'diamond':
        return (
          <RegularPolygon 
            key={el.id}
            {...commonProps} 
            sides={4} 
            radius={Math.abs(el.width || 0)} 
            rotation={(el.rotation || 0) + 45} 
            fill={el.fill}
          />
        );
      case 'triangle':
        return <RegularPolygon key={el.id} {...commonProps} sides={3} radius={Math.abs(el.width || 0)} fill={el.fill} />;
      case 'text':
        return (
          <Text 
            key={el.id}
            {...commonProps} 
            text={el.text} 
            fontSize={20} 
            fill={el.stroke} 
            onDblClick={() => handleTextDblClick(el.id)}
            onDblTap={() => handleTextDblClick(el.id)}
          />
        );
      default:
        return null;
    }
  };

  const editingElement = elements.find(el => el.id === editingId);

  return (
    <div className="h-full w-full relative bg-[#090c10] flex flex-row overflow-hidden" ref={containerRef}>
      {/* Side Toolbar (draw.io style) */}
      <div className="w-14 bg-[#161b22] border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-20">
        <div className="flex flex-col gap-2">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title="Select (V)" icon={<MousePointer2 size={20} />} />
          <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} title="Pencil (P)" icon={<Pen size={20} />} />
        </div>
        
        <div className="w-8 h-px bg-slate-800" />

        <div className="flex flex-col gap-2">
          <ToolButton active={false} onClick={handleUndo} title="Undo (Ctrl+Z)" icon={<Undo2 size={20} />} />
          <ToolButton active={false} onClick={handleRedo} title="Redo (Ctrl+Y)" icon={<Redo2 size={20} />} />
        </div>
        
        <div className="w-8 h-px bg-slate-800" />
        
        <div className="flex flex-col gap-2">
          <ToolButton active={tool === 'rectangle'} onClick={() => setTool('rectangle')} title="Rectangle (R)" icon={<Square size={20} />} />
          <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} title="Circle (C)" icon={<CircleIcon size={20} />} />
          <ToolButton active={tool === 'diamond'} onClick={() => setTool('diamond')} title="Diamond (D)" icon={<Diamond size={20} />} />
          <ToolButton active={tool === 'triangle'} onClick={() => setTool('triangle')} title="Triangle (T)" icon={<Triangle size={20} />} />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} title="Text (X)" icon={<Type size={20} />} />
        </div>

        <div className="mt-auto flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5 items-center">
             {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (selectedId) {
                    setElements(prev => {
                      const index = prev.findIndex(el => el.id === selectedId);
                      if (index === -1) return prev;
                      const next = [...prev];
                      next[index] = { ...next[index], stroke: c, fill: next[index].type === 'text' ? c : next[index].fill };
                      socket.emit('canvas-change', { roomId, drawingData: next[index] });
                      return next;
                    });
                  }
                }}
                className={`w-5 h-5 rounded transition-all hover:scale-110 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#161b22]' : 'opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button 
            onClick={clearCanvas}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* Floating properties if something is selected */}
        {selectedId && tool === 'select' && (
          <div className="absolute top-4 left-4 bg-[#161b22]/90 backdrop-blur shadow-xl border border-slate-700 rounded-md p-2 z-20 flex gap-2 items-center text-xs text-slate-300">
             <span className="font-mono opacity-50 px-1">PROPERTIES</span>
             <div className="h-4 w-px bg-slate-800" />
             <label className="flex items-center gap-1">
               Size
               <input 
                type="range" min="1" max="10" value={strokeWidth} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setStrokeWidth(val);
                  if (selectedId) {
                    setElements(prev => {
                      const index = prev.findIndex(el => el.id === selectedId);
                      if (index === -1) return prev;
                      const next = [...prev];
                      next[index] = { ...next[index], strokeWidth: val };
                      socket.emit('canvas-change', { roomId, drawingData: next[index] });
                      return next;
                    });
                  }
                }}
                className="w-16 h-1 bg-slate-700 rounded-none accent-blue-500"
               />
             </label>
             {elements.find(el => el.id === selectedId)?.type === 'text' && (
               <>
                 <div className="h-4 w-px bg-slate-800" />
                 <input 
                   type="text" 
                   value={elements.find(el => el.id === selectedId)?.text || ''}
                   onChange={(e) => {
                     const val = e.target.value;
                     setElements(prev => {
                       const index = prev.findIndex(el => el.id === selectedId);
                       if (index === -1) return prev;
                       const next = [...prev];
                       next[index] = { ...next[index], text: val };
                       socket.emit('canvas-change', { roomId, drawingData: next[index] });
                       return next;
                     });
                   }}
                   className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white w-32 focus:outline-none focus:border-blue-500"
                 />
               </>
             )}
             <button 
               onClick={() => {
                 setHistory(h => [...h, elements]);
                 setFuture([]);
                 const newElements = elements.filter(el => el.id !== selectedId);
                 setElements(newElements);
                 socket.emit('canvas-element-delete', { roomId, elementId: selectedId });
                 setSelectedId(null);
               }}
               className="ml-2 hover:text-red-400"
             >
               Delete
             </button>
          </div>
        )}

        <Stage
          width={dimensions.width - 56} // subtract sidebar width
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
          className="cursor-crosshair bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:40px_40px]"
        >
          <Layer>
            {elements.map(renderElement)}
            {tool === 'select' && !editingId && <Transformer 
                ref={transformerRef} 
                rotateEnabled={true} 
                anchorSize={8}
                anchorFill="#3b82f6"
                anchorStroke="#ffffff"
                anchorStrokeWidth={1}
                borderStroke="#3b82f6"
                borderStrokeWidth={1}
                padding={5}
              />}
          </Layer>
        </Stage>

        {editingElement && (
          <textarea
            className="absolute z-30 bg-transparent border-none p-0 m-0 outline-none resize-none font-sans text-[20px] overflow-hidden whitespace-pre-wrap select-text"
            style={{
              top: editingElement.y,
              left: editingElement.x + 56, // Apply offset for side toolbar
              color: editingElement.stroke,
              transformOrigin: 'top left',
              transform: `rotate(${editingElement.rotation || 0}deg)`,
              width: editingElement.width || 'auto',
              minWidth: '100px',
            }}
            autoFocus
            defaultValue={editingElement.text}
            onChange={(e) => handleTextChange(editingElement.id, e.target.value)}
            onBlur={() => setEditingId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setEditingId(null);
              }
              if (e.key === 'Escape') {
                setEditingId(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, title, icon }: { active: boolean, onClick: () => void, title: string, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-md transition-all ${active ? 'text-blue-400 bg-blue-400/10 border border-blue-400/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
      title={title}
    >
      {icon}
    </button>
  );
}
