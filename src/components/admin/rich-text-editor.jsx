"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaCode,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaMinus,
  FaRotateLeft,
  FaRotateRight,
} from "react-icons/fa6";

const MenuBar = ({ editor }) => {
  const locale = useLocale();

  if (!editor) {
    return null;
  }

  const buttons = [
    {
      icon: FaBold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      title: locale === "ko" ? "굵게" : "Bold",
    },
    {
      icon: FaItalic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      title: locale === "ko" ? "기울임" : "Italic",
    },
    {
      icon: FaStrikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
      title: locale === "ko" ? "취소선" : "Strikethrough",
    },
    {
      icon: FaCode,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
      title: locale === "ko" ? "코드" : "Code",
    },
    { type: "divider" },
    {
      icon: FaListUl,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      title: locale === "ko" ? "글머리 기호" : "Bullet List",
    },
    {
      icon: FaListOl,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      title: locale === "ko" ? "번호 목록" : "Ordered List",
    },
    { type: "divider" },
    {
      icon: FaQuoteLeft,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
      title: locale === "ko" ? "인용" : "Blockquote",
    },
    {
      icon: FaMinus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      title: locale === "ko" ? "구분선" : "Horizontal Rule",
    },
    { type: "divider" },
    {
      icon: FaRotateLeft,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      disabled: !editor.can().undo(),
      title: locale === "ko" ? "실행 취소" : "Undo",
    },
    {
      icon: FaRotateRight,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      disabled: !editor.can().redo(),
      title: locale === "ko" ? "다시 실행" : "Redo",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/50 p-2">
      {/* Heading buttons */}
      <select
        className="mr-2 rounded border bg-background px-2 py-1 text-sm"
        value={
          editor.isActive("heading", { level: 1 })
            ? "h1"
            : editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
            ? "h3"
            : "p"
        }
        onChange={(e) => {
          const value = e.target.value;
          if (value === "p") {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(value.replace("h", ""));
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
      >
        <option value="p">{locale === "ko" ? "본문" : "Paragraph"}</option>
        <option value="h1">{locale === "ko" ? "제목 1" : "Heading 1"}</option>
        <option value="h2">{locale === "ko" ? "제목 2" : "Heading 2"}</option>
        <option value="h3">{locale === "ko" ? "제목 3" : "Heading 3"}</option>
      </select>

      {buttons.map((button, index) => {
        if (button.type === "divider") {
          return <div key={index} className="mx-1 h-6 w-px bg-border" />;
        }

        return (
          <Button
            key={index}
            type="button"
            variant={button.isActive ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={button.action}
            disabled={button.disabled}
            title={button.title}
          >
            <button.icon size={14} />
          </Button>
        );
      })}
    </div>
  );
};

export default function RichTextEditor({ content, onChange, placeholder }) {
  const locale = useLocale();

  const editor = useEditor({
    extensions: [StarterKit],
    content: content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        placeholder={placeholder || (locale === "ko" ? "내용을 입력하세요..." : "Start writing...")}
      />
    </div>
  );
}
