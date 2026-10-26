"use client";

import { useEffect, useRef, useState } from "react";

export interface Announcement {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  body: string | null;
  image_urls: string[];
  view_count: number;
}

interface Props {
  announcements: Announcement[];
  canEdit: boolean;
}

const PAGE_SIZE = 15;

function formatDate(str: string) {
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() <= THREE_DAYS_MS;
}

function NewBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold-500 text-white leading-none align-middle ml-1.5">
      NEW
    </span>
  );
}

// 상품 이미지 업로드와 동일한 방식: 긴 변 기준 1200px로 리사이즈 후 webp로 압축
function compressImage(file: File, maxPx = 1200, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context 생성 실패")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("압축 실패")), "image/webp", quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function AnnouncementsBoardClient({ announcements, canEdit }: Props) {
  const [items, setItems] = useState<Announcement[]>(announcements);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = items.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/announcements/${selectedId}/view`, { method: "POST" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setImageUrls([]);
    setError(null);
    setCreating(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title);
    setBody(a.body ?? "");
    setImageUrls(a.image_urls ?? []);
    setError(null);
    setCreating(true);
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setCreating(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file).catch(() => file);
        const formData = new FormData();
        formData.append("file", compressed, `${file.name.split(".")[0]}.webp`);
        const res = await fetch("/api/operator/announcements/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "이미지 업로드 실패"); continue; }
        setImageUrls((prev) => [...prev, data.url]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        editing ? `/api/operator/announcements/${editing.id}` : "/api/operator/announcements",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, imageUrls }),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "저장 중 오류가 발생했습니다."); return; }

      if (editing) {
        setItems((prev) => prev.map((a) => a.id === editing.id ? { ...a, title, body, image_urls: imageUrls, updated_at: new Date().toISOString() } : a));
      } else {
        setItems((prev) => [data, ...prev]);
        setPage(1);
      }
      setCreating(false);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`"${a.title}" 공지를 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/operator/announcements/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      if (selectedId === a.id) setSelectedId(null);
    }
  };

  // 상세 보기
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
        >
          ← 목록으로
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selected.title}
                {isNew(selected.created_at) && <NewBadge />}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(selected.created_at)}
                {canEdit && <> · 조회 {selected.view_count.toLocaleString()}회</>}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(selected)} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                  수정
                </button>
                <button onClick={() => handleDelete(selected)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                  삭제
                </button>
              </div>
            )}
          </div>
          {selected.body && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{selected.body}</p>}
          {selected.image_urls?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selected.image_urls.map((url) => (
                <img key={url} src={url} alt="" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
              ))}
            </div>
          )}
        </div>

        {canEdit && creating && (
          <EditorModal
            editing={editing}
            title={title} setTitle={setTitle}
            body={body} setBody={setBody}
            imageUrls={imageUrls} removeImage={removeImage}
            uploading={uploading} saving={saving} error={error}
            fileInputRef={fileInputRef}
            onFiles={handleFiles}
            onClose={closeEditor}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  // 목록 보기
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            새 공지 작성
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400">
              <th className="text-left px-5 py-3 font-medium w-16">번호</th>
              <th className="text-center px-5 py-3 font-medium">제목</th>
              <th className="text-right px-5 py-3 font-medium whitespace-nowrap w-36">등록 일시</th>
              {canEdit && <th className="text-right px-5 py-3 font-medium whitespace-nowrap w-20">조회수</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-5 py-10 text-center text-gray-300 text-sm">등록된 공지사항이 없습니다.</td>
              </tr>
            )}
            {paginated.map((a, i) => (
              <tr
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-5 py-3.5 text-xs text-gray-400">{items.length - ((currentPage - 1) * PAGE_SIZE + i)}</td>
                <td className="px-5 py-3.5 text-center font-medium text-gray-900">
                  {a.title}
                  {isNew(a.created_at) && <NewBadge />}
                </td>
                <td className="px-5 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">{formatDate(a.created_at)}</td>
                {canEdit && <td className="px-5 py-3.5 text-right text-gray-500 whitespace-nowrap">{a.view_count.toLocaleString()}</td>}
              </tr>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paginated.length - (paginated.length === 0 ? 1 : 0)) }, (_, i) => (
              <tr key={`empty-${i}`} className="h-[46px]">
                <td colSpan={canEdit ? 4 : 3} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이징 */}
      <div className="flex items-center justify-center gap-1 pt-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            className={`text-xs w-8 py-1.5 rounded-lg border transition-colors ${
              n === currentPage
                ? "bg-gold-500 text-white border-gold-500 font-medium"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>

      {canEdit && creating && (
        <EditorModal
          editing={editing}
          title={title} setTitle={setTitle}
          body={body} setBody={setBody}
          imageUrls={imageUrls} removeImage={removeImage}
          uploading={uploading} saving={saving} error={error}
          fileInputRef={fileInputRef}
          onFiles={handleFiles}
          onClose={closeEditor}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function EditorModal({
  editing, title, setTitle, body, setBody, imageUrls, removeImage,
  uploading, saving, error, fileInputRef, onFiles, onClose, onSave,
}: {
  editing: Announcement | null;
  title: string; setTitle: (v: string) => void;
  body: string; setBody: (v: string) => void;
  imageUrls: string[]; removeImage: (url: string) => void;
  uploading: boolean; saving: boolean; error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900">{editing ? "공지사항 수정" : "새 공지 작성"}</h3>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 placeholder-gray-300"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용을 입력하세요 (이모지 🎉도 그대로 사용 가능합니다)"
            rows={6}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 resize-none placeholder-gray-300"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">이미지</label>
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {imageUrls.map((url) => (
                <div key={url} className="relative group">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                  <button
                    onClick={() => removeImage(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? "업로드 중…" : "이미지 추가"}
          </button>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSave}
            disabled={saving || uploading}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
