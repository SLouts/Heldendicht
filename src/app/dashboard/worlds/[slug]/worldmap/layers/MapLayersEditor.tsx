"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageIfNeeded } from "@/lib/imageResize";
import {
  createMapLayer,
  renameMapLayer,
  deleteMapLayer,
  moveMapLayer,
  createMapLayerUploadTicket,
  finalizeMapLayerUpload,
  removeMapLayerImage,
} from "@/lib/actions/worldmap";

const WORLD_MAP_BUCKET = "world-maps";

export type MapLayerItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  hasImage: boolean;
};

function LayerImageUpload({
  layerId,
  worldId,
  worldSlug,
  imageUrl,
  hasImage,
}: {
  layerId: string;
  worldId: string;
  worldSlug: string;
  imageUrl: string | null;
  hasImage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const originalFile = fileInput.files?.[0];
    if (!originalFile) {
      setError("請選擇一張圖片");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const file = await downscaleImageIfNeeded(originalFile);

      const ticket = await createMapLayerUploadTicket(layerId, worldId, file.type, file.size);
      if ("error" in ticket) {
        setError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(WORLD_MAP_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) {
        setError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeMapLayerUpload(layerId, worldId, worldSlug, ticket.path);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
    } catch {
      setError("上傳失敗,請稍後再試");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
        <img
          src={imageUrl}
          alt="圖層底圖預覽"
          className="max-h-40 w-full rounded-lg border border-border object-contain bg-surface"
        />
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "上傳中…" : hasImage ? "更換底圖" : "上傳底圖"}
        </button>
        {hasImage && (
          <button
            type="button"
            onClick={() => {
              if (confirm("確定要移除這張圖層的底圖嗎?已經標的座標會保留,之後重新上傳底圖會繼續套用。")) {
                void removeMapLayerImage(layerId, worldId, worldSlug);
              }
            }}
            className="text-xs text-danger underline"
          >
            移除底圖
          </button>
        )}
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function LayerItem({
  layer,
  index,
  total,
  worldId,
  worldSlug,
}: {
  layer: MapLayerItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(renameMapLayer, undefined);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      {isEditing ? (
        <form
          action={async (formData) => {
            await formAction(formData);
            setIsEditing(false);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="layerId" value={layer.id} />
          <input type="hidden" name="worldId" value={worldId} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input
            name="name"
            defaultValue={layer.name}
            required
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "儲存中…" : "儲存"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground underline"
          >
            取消
          </button>
          {state && "error" in state && <p className="w-full text-sm text-danger">{state.error}</p>}
          {state && "fieldErrors" in state && (
            <p className="w-full text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">{layer.name}</span>
          <div className="ml-auto flex gap-3 text-xs">
            <button type="button" onClick={() => setIsEditing(true)} className="underline">
              改名
            </button>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => void moveMapLayer(layer.id, worldId, worldSlug, "up")}
              className="underline disabled:opacity-30"
            >
              上移
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => void moveMapLayer(layer.id, worldId, worldSlug, "down")}
              className="underline disabled:opacity-30"
            >
              下移
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `確定要刪除「${layer.name}」這張圖層嗎?標在這張圖層上的節點座標會一併清空(節點本身不受影響)。`,
                  )
                ) {
                  void deleteMapLayer(layer.id, worldId, worldSlug);
                }
              }}
              className="text-danger underline"
            >
              刪除
            </button>
          </div>
        </div>
      )}

      <LayerImageUpload
        layerId={layer.id}
        worldId={worldId}
        worldSlug={worldSlug}
        imageUrl={layer.imageUrl}
        hasImage={layer.hasImage}
      />
    </div>
  );
}

export function MapLayersEditor({
  worldId,
  worldSlug,
  layers,
}: {
  worldId: string;
  worldSlug: string;
  layers: MapLayerItem[];
}) {
  const [createState, createAction, createPending] = useActionState(createMapLayer, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {layers.map((layer, i) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            index={i}
            total={layers.length}
            worldId={worldId}
            worldSlug={worldSlug}
          />
        ))}
        {layers.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有任何圖層。</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-layer-name" className="text-sm font-medium">
            新增圖層
          </label>
          <input
            id="new-layer-name"
            name="name"
            placeholder="例如「地下城 1F」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={createPending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {createPending ? "新增中…" : "+ 新增"}
        </button>
        {createState && "error" in createState && (
          <p className="w-full text-sm text-danger">{createState.error}</p>
        )}
        {createState && "fieldErrors" in createState && (
          <p className="w-full text-sm text-danger">
            {Object.values(createState.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    </div>
  );
}
