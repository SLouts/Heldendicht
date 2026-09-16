/**
 * 把文字插入到 textarea 目前的游標位置(如果有選取範圍就取代選取的內容),
 * 插入後把游標移到插入內容的後面,並補發一個 input 事件讓其他監聽者
 * (例如 React 的 uncontrolled textarea)知道值變了。
 */
export function insertTextAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const newPos = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = newPos;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
