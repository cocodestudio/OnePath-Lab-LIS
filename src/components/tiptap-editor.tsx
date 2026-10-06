"use client";

import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute("style"),
        renderHTML: attributes => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});
import CharacterCount from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import {
  Bold, Italic, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
  Type, Highlighter, LayoutGrid, Image as ImageIcon,
  MoreHorizontal, Minus, Plus, ChevronDown, PaintBucket, Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onClose?: () => void;
  title?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  editorRef?: React.MutableRefObject<Editor | null>;
}

export function TipTapEditor({ 
  value, 
  onChange, 
  onSave, 
  onClose, 
  title = "Interpretation",
  hideHeader = false,
  hideFooter = false,
  editorRef
}: TipTapEditorProps) {
  const [currentFontSize, setCurrentFontSize] = useState(16); // default 16px
  const [isTableActive, setIsTableActive] = useState(false);
  
  const [tablePropsOpen, setTablePropsOpen] = useState(false);
  const [tableWidth, setTableWidth] = useState("");
  const [tableHeight, setTableHeight] = useState("");
  const [tableBorderWidth, setTableBorderWidth] = useState("");
  
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CustomTable.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      CharacterCount.configure({ limit: null }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      FontSize,
    ],
    content: value || "<p></p>",
    onSelectionUpdate: ({ editor }) => {
      setIsTableActive(editor.isActive("table"));
    },
    onTransaction: ({ editor }) => {
      setIsTableActive(editor.isActive("table"));
      onChange(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      setIsTableActive(editor.isActive("table"));
      onChange(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Keep content synchronized if value updates from outside
  useEffect(() => {
    if (editor && value !== undefined) {
      const cur = editor.getHTML();
      const target = value || "<p></p>";
      if (cur !== target && value !== cur) {
        editor.commands.setContent(target);
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      setIsTableActive(editor.isActive("table"));
      // Keep track of font size logic
      const sizeStr = editor.getAttributes("textStyle").fontSize;
      if (sizeStr) {
        setCurrentFontSize(parseInt(sizeStr));
      } else {
        setCurrentFontSize(16);
      }
    }
  }, [editor, editor?.state.selection]);

  if (!editor) return null;

  const handleDecreaseFont = () => {
    const newSize = Math.max(8, currentFontSize - 1);
    setCurrentFontSize(newSize);
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  };

  const handleIncreaseFont = () => {
    const newSize = Math.min(72, currentFontSize + 1);
    setCurrentFontSize(newSize);
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  };

  const activeNodeName = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Paragraph";
  };

  const wordCount = editor.storage.characterCount.words();

  const openTableProps = () => {
    if (!editor) return;
    const attrs = editor.getAttributes("table");
    if (!attrs) return;
    
    // Parse existing style
    const style = attrs.style || "";
    const widthMatch = style.match(/width:\s*([^;]+)/);
    const heightMatch = style.match(/height:\s*([^;]+)/);
    const borderMatch = style.match(/border-width:\s*([^;]+)/);
    
    setTableWidth(widthMatch ? widthMatch[1].trim() : "");
    setTableHeight(heightMatch ? heightMatch[1].trim() : "");
    setTableBorderWidth(borderMatch ? borderMatch[1].trim() : "");
    
    setTablePropsOpen(true);
  };

  const applyTableProps = () => {
    if (!editor) return;
    
    let w = tableWidth.trim();
    let h = tableHeight.trim();
    let b = tableBorderWidth.trim();

    // Height Guard
    if (h) {
      const hVal = parseInt(h);
      if (isNaN(hVal)) {
        h = "";
      } else {
        if (hVal > 800) h = "800px"; // Max height guard
        else if (hVal < 20) h = "20px";
        else if (!h.endsWith("px") && !h.endsWith("%")) h = hVal + "px";
      }
    }

    // Width Guard
    if (w) {
      const wVal = parseInt(w);
      if (isNaN(wVal)) {
        w = "";
      } else {
        if (w.endsWith("%")) {
          if (wVal > 100) w = "100%";
          else w = wVal + "%";
        } else {
          if (wVal > 1200) w = "100%";
          else if (wVal < 50) w = "50px";
          else if (!w.endsWith("px")) w = wVal + "px";
        }
      }
    }

    // Border Guard
    if (b) {
      const bVal = parseInt(b);
      if (isNaN(bVal)) {
        b = "";
      } else {
        if (bVal > 20) b = "20px";
        else if (bVal < 0) b = "0px";
        else if (!b.endsWith("px")) b = bVal + "px";
      }
    }

    let styleStr = "";
    if (w) styleStr += `width: ${w}; `;
    if (h) styleStr += `height: ${h}; `;
    if (b) styleStr += `border-width: ${b}; `;

    // Apply to TipTap Model
    editor.chain().focus().updateAttributes("table", { style: styleStr.trim() }).run();
    onChange(editor.getHTML());

    // Force DOM update immediately for TableView cache bypass
    setTimeout(() => {
      const { selection } = editor.state;
      const { $from } = selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === 'table') {
          const pos = $from.before(depth);
          const dom = editor.view.nodeDOM(pos) as HTMLElement;
          if (dom) {
            const tableEl = dom.nodeName === 'TABLE' ? dom : dom.querySelector('table');
            if (tableEl) {
              tableEl.style.width = w || "";
              tableEl.style.height = h || "";
              tableEl.style.borderWidth = b || "";
            }
          }
          break;
        }
      }
    }, 10);

    setTablePropsOpen(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-md" style={{ minHeight: '400px', maxHeight: '100%' }}>
      
      {/* Table Properties Dialog */}
      <Dialog open={tablePropsOpen} onOpenChange={setTablePropsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Table Properties</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="width" className="text-right">Width</Label>
              <Input id="width" value={tableWidth} onChange={(e) => setTableWidth(e.target.value)} placeholder="e.g. 100% or 400px" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="height" className="text-right">Height</Label>
              <Input id="height" value={tableHeight} onChange={(e) => setTableHeight(e.target.value)} placeholder="e.g. 200px" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="border" className="text-right">Border Width</Label>
              <Input id="border" value={tableBorderWidth} onChange={(e) => setTableBorderWidth(e.target.value)} placeholder="e.g. 2px" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={applyTableProps}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!hideHeader && (
        <>
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>
          
          {/* Divider */}
          <div className="h-[1px] bg-border/40 w-full"></div>
        </>
      )}
      
      {/* Custom Fixed Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-muted/20">
        
        {/* 1. History Controls */}
        <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1">
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50 text-foreground/80"><Undo className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-muted disabled:opacity-50 text-foreground/80"><Redo className="w-4 h-4" /></button>
        </div>

        {/* 2. Node Formatting Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-muted border border-border/40 text-sm font-medium text-foreground/80 outline-none">
            {activeNodeName()} <ChevronDown className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => editor.chain().focus().setParagraph().run()}>Paragraph</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>Heading 1</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Heading 2</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>Heading 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-[1px] bg-border/50 mx-1"></div>

        {/* 3. Font-Size Stepper Control */}
        <div className="flex items-center bg-muted/30 border border-border/40 rounded overflow-hidden">
          <button onClick={handleDecreaseFont} className="px-2 py-1.5 hover:bg-muted text-foreground/80"><Minus className="w-3 h-3" /></button>
          <span className="text-xs font-medium px-2 text-foreground/80 min-w-[36px] text-center">{currentFontSize}px</span>
          <button onClick={handleIncreaseFont} className="px-2 py-1.5 hover:bg-muted text-foreground/80"><Plus className="w-3 h-3" /></button>
        </div>

        <div className="h-6 w-[1px] bg-border/50 mx-1"></div>

        {/* 4. Text Style Toggles */}
        <div className="flex items-center gap-1">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded text-foreground/80 ${editor.isActive("bold") ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}><Bold className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded text-foreground/80 ${editor.isActive("italic") ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}><Italic className="w-4 h-4" /></button>
        </div>

        <div className="h-6 w-[1px] bg-border/50 mx-1"></div>

        {/* 5. Color/Highlight Actions */}
        <div className="flex items-center gap-1 relative">
          <div className="relative inline-flex">
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} value={editor.getAttributes("textStyle").color || "#000000"} />
            <button className="p-1.5 rounded hover:bg-muted text-foreground/80 relative flex flex-col items-center justify-center">
              <Type className="w-4 h-4" />
              <div className="w-4 h-[3px] rounded-full mt-[1px]" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}></div>
            </button>
          </div>
          <div className="relative inline-flex">
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} value={editor.getAttributes("highlight").color || "#ffff00"} />
            <button className="p-1.5 rounded hover:bg-muted text-foreground/80 relative flex flex-col items-center justify-center">
              <Highlighter className="w-4 h-4" />
              <div className="w-4 h-[3px] rounded-full mt-[1px]" style={{ backgroundColor: editor.getAttributes("highlight").color || "transparent" }}></div>
            </button>
          </div>
          <div className="relative inline-flex">
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => editor.chain().focus().setCellAttribute('backgroundColor', e.target.value).run()} value="#ffffff" />
            <button className="p-1.5 rounded hover:bg-muted text-foreground/80 relative flex flex-col items-center justify-center">
              <PaintBucket className="w-4 h-4" />
              <div className="w-4 h-[3px] rounded-full mt-[1px]" style={{ backgroundColor: "transparent" }}></div>
            </button>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-border/50 mx-1"></div>

        {/* 6. Alignment Blocks */}
        <div className="flex items-center gap-1">
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded text-foreground/80 ${editor.isActive({ textAlign: 'left' }) ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}><AlignLeft className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded text-foreground/80 ${editor.isActive({ textAlign: 'center' }) ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}><AlignCenter className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded text-foreground/80 ${editor.isActive({ textAlign: 'right' }) ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}><AlignRight className="w-4 h-4" /></button>
        </div>

        <div className="h-6 w-[1px] bg-border/50 mx-1"></div>

        {/* 7. Rich Node Triggers */}
        <div className="flex items-center gap-1">
          <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded hover:bg-muted text-foreground/80"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => {
            const url = window.prompt("URL");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }} className="p-1.5 rounded hover:bg-muted text-foreground/80"><ImageIcon className="w-4 h-4" /></button>
        </div>

        {/* Table Active Direct Controls (Row delete, Row add, Table size) */}
        {isTableActive && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/60">
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 active:scale-95 border border-red-300 rounded-md transition-all shadow-xs cursor-pointer animate-in fade-in"
              title="Delete current selected antibiotic row"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Row</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 active:scale-95 border border-emerald-300 rounded-md transition-all shadow-xs cursor-pointer animate-in fade-in"
              title="Insert new row below"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={openTableProps}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border rounded-md transition-all shadow-xs cursor-pointer"
              title="Adjust table width and height"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Table Size</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded-md transition-all cursor-pointer opacity-80 hover:opacity-100"
              title="Delete entire table"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            </button>
          </div>
        )}

        {/* 8. Overflow Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1.5 ml-auto rounded hover:bg-muted text-foreground/80 outline-none">
            <MoreHorizontal className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>Add Column Before</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>Add Column After</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>Delete Column</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>Add Row Before</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>Add Row After</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>Delete Row</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()}>Delete Table</DropdownMenuItem>
            <DropdownMenuItem onClick={openTableProps} disabled={!editor.isActive('table')}>Table Properties...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 overflow-y-auto bg-muted/5 relative min-h-[350px] max-h-[70vh] p-2">
        {/* Floating Table Quick Actions Bar */}
        {isTableActive && (
          <div className="sticky top-2 z-20 mx-auto w-fit flex items-center gap-2 px-3 py-1.5 bg-background/95 border border-border/90 shadow-md backdrop-blur-xs rounded-full text-xs font-semibold animate-in fade-in slide-in-from-top-1">
            <span className="flex items-center gap-1 text-muted-foreground text-[11px] font-bold uppercase tracking-wider pr-1 border-r border-border">
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              Table
            </span>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full font-bold transition-all text-xs cursor-pointer"
              title="Delete this antibiotic row"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              Delete Row
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-bold transition-all text-xs cursor-pointer"
              title="Add row below"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              Add Row
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="flex items-center gap-1 px-2.5 py-0.5 text-muted-foreground hover:text-red-600 rounded-full font-semibold transition-all text-[11px] cursor-pointer"
              title="Delete entire table"
            >
              Remove Table
            </button>
          </div>
        )}
        <div className="min-h-full p-4 mx-auto w-full max-w-4xl">
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none focus:outline-none 
              [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none 
              [&_.ProseMirror.resize-cursor]:cursor-col-resize
              [&_.ProseMirror_p]:my-1
              [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:table-auto [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-3 [&_.ProseMirror_table]:border-solid [&_.ProseMirror_table]:border-border
              [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_td]:border-solid [&_.ProseMirror_td]:relative
              [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:border-solid [&_.ProseMirror_th]:bg-muted/30 [&_.ProseMirror_th]:relative
              [&_.ProseMirror_tr]:border-border [&_.ProseMirror_tr]:border-solid
              [&_.ProseMirror_thead]:border-border [&_.ProseMirror_thead]:border-solid
              [&_.ProseMirror_tbody]:border-border [&_.ProseMirror_tbody]:border-solid
              [&_.selectedCell::after]:absolute [&_.selectedCell::after]:inset-0 [&_.selectedCell::after]:bg-blue-500/20 [&_.selectedCell::after]:pointer-events-none [&_.selectedCell::after]:content-['']
              [&_.column-resize-handle]:absolute [&_.column-resize-handle]:-right-1 [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:w-2 [&_.column-resize-handle]:bg-primary/40 [&_.column-resize-handle]:pointer-events-auto [&_.column-resize-handle]:cursor-col-resize" 
          />
        </div>
      </div>

      {!hideFooter && (
        <>
          {/* Footer Controls Bar */}
          <div className="h-[1px] bg-border/40 w-full"></div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-white relative">
            <div className="text-xs font-medium text-muted-foreground">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </div>
            
            <div className="flex items-center gap-2">
              {onClose && <Button variant="outline" onClick={onClose} className="px-6">Cancel</Button>}
              {onSave && <Button onClick={onSave} className="px-6">Save</Button>}
            </div>

            {/* Resize Anchor Element */}
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
              <svg viewBox="0 0 10 10" className="w-full h-full text-muted-foreground/30">
                <path d="M 8 2 L 10 0 L 10 10 L 0 10 L 2 8 L 8 8 Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
