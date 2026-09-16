"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type Kind = "image" | "file";

type Attachment = {
  id: string;
  kind: Kind;
  fileName: string;
  fileSize: number;
  uploader: string;
  date: string;
  url?: string;
};

// 用 URL-encode 而不是 base64 —— SVG 裡有中文字元,瀏覽器的 btoa() 只吃
// Latin1,直接編會丟 InvalidCharacterError;URL-encode 在 server/client
// 兩邊行為一致,不用另外分支處理。
const CITY_IMG = "data:image/svg+xml," + encodeURIComponent(CITY_SVG());

function CITY_SVG() {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2c2440"/><stop offset="1" stop-color="#6a3f8f"/>' +
    "</linearGradient></defs>" +
    '<rect width="480" height="280" fill="url(#g)"/>' +
    '<circle cx="380" cy="60" r="34" fill="#f4d9a0"/>' +
    '<path d="M0 210 L60 150 L120 200 L190 120 L260 190 L330 140 L400 205 L480 160 L480 280 L0 280 Z" fill="#1a1428"/>' +
    '<text x="240" y="255" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#f1ece2">城市空拍示意圖</text>' +
    "</svg>"
  );
}

const INITIAL_CONTENT =
  "這座城市矗立在永夜之中,城牆頂端常年繚繞極光的餘光。\n\n{{image:img-1}}\n\n城牆內有 [[雪奈]] 常去的酒館,據說地窖裡還留著前代守夜人的紀錄。";

const INITIAL_ATTACHMENTS: Attachment[] = [
  {
    id: "img-1",
    kind: "image",
    fileName: "city-view.png",
    fileSize: 245678,
    uploader: "雪奈玩家",
    date: "2026/09/14",
    url: CITY_IMG,
  },
  {
    id: "pdf-1",
    kind: "file",
    fileName: "城市設定資料.pdf",
    fileSize: 1048576,
    uploader: "主辦",
    date: "2026/09/14",
  },
];

const WIKILINKS = new Map([["雪奈", { slug: "yukina", isPlaceholder: false }]]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 跟真正的 WikiLinkContent.tsx 同一套 regex 邏輯,方便對照:
// [[名稱]] 是 WikiLink,{{image:id}} 是圖片嵌入,兩者互不相交。
// 寫成元件(而不是在 render 裡直接呼叫的一般函式),是因為 onWikiLinkClick
// 這個 callback 內部會碰到 ref(toast 計時器),透過 JSX prop 傳遞才是
// React Compiler 認得的安全模式,直接當一般函式參數傳會被 lint 擋下來。
function RenderedContent({
  content,
  attachments,
  onWikiLinkClick,
}: {
  content: string;
  attachments: Attachment[];
  onWikiLinkClick: () => void;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const pattern = /\[\[([^[\]]+)\]\]|\{\{image:([\w-]+)\}\}/g;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{content.slice(lastIndex, match.index)}</Fragment>);
    }

    if (match[1] !== undefined) {
      const name = match[1].trim();
      const target = WIKILINKS.get(name);
      if (target) {
        parts.push(
          <button
            key={key++}
            type="button"
            onClick={onWikiLinkClick}
            className="text-badge-info-fg underline decoration-badge-info-fg/50"
          >
            {name}
          </button>,
        );
      } else {
        parts.push(<Fragment key={key++}>[[{name}]]</Fragment>);
      }
    } else {
      const id = match[2];
      const att = attachments.find((a) => a.id === id && a.kind === "image");
      if (att) {
        parts.push(
          // eslint-disable-next-line @next/next/no-img-element -- demo 用本地/data URL,無法用 next/image 白名單網域
          <img
            key={key++}
            src={att.url}
            alt={att.fileName}
            className="my-2 block max-h-80 max-w-full rounded-lg border border-border"
          />,
        );
      } else {
        parts.push(
          <span
            key={key++}
            className="rounded bg-badge-danger-bg px-1.5 py-0.5 text-xs text-badge-danger-fg"
          >
            {match[0]} · 附件已刪除
          </span>,
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(<Fragment key={key++}>{content.slice(lastIndex)}</Fragment>);
  }
  return <>{parts}</>;
}

export function AttachmentsDemoClient() {
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [attachments, setAttachments] = useState<Attachment[]>(INITIAL_ATTACHMENTS);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const canEdit = role === "editor";

  const handleWikiLinkClick = useCallback(() => {
    showToast("示範連結,不會真的跳頁");
  }, [showToast]);

  // 跟真正的 EditNodeForm 一樣改成「直接插到游標位置」,不用再讓使用者
  // 自己複製語法、切去內文欄位貼上——差別是這裡的 textarea 是 controlled
  // (value + onChange),所以插入完要用 requestAnimationFrame 在下一次
  // render 之後才能正確設回游標位置,不能像真正那邊直接操作 DOM value。
  const insertIntoContent = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart ?? contentRef.current.length;
    const end = textarea.selectionEnd ?? contentRef.current.length;
    setContent(contentRef.current.slice(0, start) + text + contentRef.current.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
  }, []);

  const handleInsert = useCallback(
    (id: string) => {
      insertIntoContent(`{{image:${id}}}`);
      setInsertedId(id);
      setTimeout(() => setInsertedId((cur) => (cur === id ? null : cur)), 1400);
    },
    [insertIntoContent],
  );

  const handleContentPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/"),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();

      const id = `up-${crypto.randomUUID()}`;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setAttachments((prev) => [
          {
            id,
            kind: "image",
            fileName: file.name || "貼上的圖片.png",
            fileSize: file.size,
            uploader: "你",
            date: "剛剛",
            url,
          },
          ...prev,
        ]);
        insertIntoContent(`{{image:${id}}}`);
        showToast("已貼上圖片並自動嵌入");
      };
      reader.readAsDataURL(file);
    },
    [insertIntoContent, showToast],
  );

  const handleDelete = useCallback(
    (id: string, fileName: string) => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      showToast(`已刪除「${fileName}」`);
    },
    [showToast],
  );

  const handleUpload = useCallback(() => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast("請先選擇一個檔案");
      return;
    }
    const isImage = /^image\/(png|jpeg|webp)$/.test(file.type);
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      showToast("只接受 PNG / JPEG / WebP 圖片或 PDF 文件");
      return;
    }

    const id = `up-${crypto.randomUUID()}`;
    const addAttachment = (url?: string) => {
      setAttachments((prev) => [
        {
          id,
          kind: isImage ? "image" : "file",
          fileName: file.name,
          fileSize: file.size,
          uploader: "你",
          date: "剛剛",
          url,
        },
        ...prev,
      ]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast(`已上傳「${file.name}」`);
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => addAttachment(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      addAttachment(undefined);
    }
  }, [showToast]);

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
        <div>
          <p className="text-sm font-medium">目前身分</p>
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? "編輯者:能編輯內文、上傳附件、刪除任何附件"
              : "檢視者:能看內容跟附件,不能上傳或刪除"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-full border border-border">
          <button
            type="button"
            onClick={() => setRole("viewer")}
            className={
              "px-4 py-1.5 text-sm font-medium transition " +
              (!canEdit ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-muted")
            }
          >
            檢視者
          </button>
          <button
            type="button"
            onClick={() => setRole("editor")}
            className={
              "px-4 py-1.5 text-sm font-medium transition " +
              (canEdit ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-muted")
            }
          >
            編輯者
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-semibold">極光之城</h2>
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            地點
          </span>
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            開放共筆
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">世界觀:極光紀元 · 建立者:主辦</p>

        {canEdit ? (
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="demo-content" className="text-sm font-medium">
              內文(編輯態,看得到原始語法)
            </label>
            <textarea
              id="demo-content"
              ref={textareaRef}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handleContentPaste}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
            />
          </div>
        ) : (
          <p className="mt-4 whitespace-pre-wrap text-sm">
            <RenderedContent
              content={content}
              attachments={attachments}
              onWikiLinkClick={handleWikiLinkClick}
            />
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-lg font-semibold">附件</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          圖片點「插入到內文」就會直接放到上面內文欄位游標所在的位置;也可以直接複製貼上圖片到內文欄位裡,像貼到一般電子郵件一樣會自動上傳並插入。PDF 等文件只會列在這裡,不能嵌入內文。
        </p>

        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="text-sm"
            />
            <button
              type="button"
              onClick={handleUpload}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover"
            >
              上傳附件
            </button>
          </div>
        )}

        {attachments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">目前還沒有附件。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2"
              >
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- demo 用本地/data URL,無法用 next/image 白名單網域
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    PDF
                  </span>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{a.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(a.fileSize)} · {a.uploader} · {a.date}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {a.kind === "image" ? (
                    <>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleInsert(a.id)}
                          className="underline"
                        >
                          {insertedId === a.id ? "已插入!" : "插入到內文"}
                        </button>
                      )}
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        開啟原圖
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => showToast("Demo 示意用,沒有實際檔案可下載")}
                      className="underline"
                    >
                      下載
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id, a.fileName)}
                      className="text-danger underline"
                    >
                      刪除
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
