export type SelectableCategory = { id: string; name: string; parent_id: string | null };

/**
 * 分類下拉選單的共用選項渲染——分類固定兩層(大分類/子分類),同一段邏輯
 * 被節點/角色的新增與編輯表單重複用了四次,抽成共用元件。呼叫端傳進來
 * 的 categories 可能已經先篩過(例如只留開放投稿的),所以這裡不假設
 * 陣列裡一定包含每個子分類對應的大分類列——如果大分類不在清單裡(被篩掉
 * 或本來就沒有),子分類會直接當成沒有分組的頂層選項顯示,不會被漏掉。
 */
export function CategorySelectOptions({ categories }: { categories: SelectableCategory[] }) {
  const ids = new Set(categories.map((c) => c.id));
  const topLevel = categories.filter((c) => c.parent_id === null || !ids.has(c.parent_id));
  const childrenByParent = new Map<string, SelectableCategory[]>();
  for (const c of categories) {
    if (c.parent_id && ids.has(c.parent_id)) {
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }
  }

  return (
    <>
      {topLevel.map((cat) => {
        const children = childrenByParent.get(cat.id) ?? [];
        if (children.length === 0) {
          return (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          );
        }
        return (
          <optgroup key={cat.id} label={cat.name}>
            <option value={cat.id}>{cat.name}(本身)</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
