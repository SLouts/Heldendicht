import Link from "next/link";
import { formatWorldDateRange } from "@/lib/worldDate";

export type SharedChapterItem = {
  id: string;
  title: string;
  description: string | null;
  yearStart: number | null;
  yearStartMonth: number | null;
  yearStartDay: number | null;
  yearEnd: number | null;
  yearEndMonth: number | null;
  yearEndDay: number | null;
  href: string;
};

/**
 * 角色節點「時間軸」分頁裡的「共同副本」區塊——這個角色被標記參與的
 * 官方章節(story_chapter_participants),唯讀,跟上面這個角色自己的
 * character_timeline_events 個人時間點是分開的兩件事:這裡列出來的章節
 * 不是這個角色擁有者能編輯的內容,編輯權限在章節本身(世界觀 staff),
 * 角色頁面只是「順便讓你看到自己參與過哪些共同場景」。
 */
export function CharacterSharedChapters({ chapters }: { chapters: SharedChapterItem[] }) {
  if (chapters.length === 0) return null;

  return (
    <section className="mt-6 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        共同副本(與其他角色共同參與的章節,唯讀)
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {chapters.map((chapter) => {
          const dateLabel = formatWorldDateRange(
            chapter.yearStart,
            chapter.yearStartMonth,
            chapter.yearStartDay,
            chapter.yearEnd,
            chapter.yearEndMonth,
            chapter.yearEndDay,
          );
          return (
            <li key={chapter.id} className="py-2">
              <Link href={chapter.href} className="block hover:underline">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{chapter.title}</span>
                  {dateLabel && (
                    <span className="text-xs text-muted-foreground">{dateLabel}</span>
                  )}
                </div>
                {chapter.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{chapter.description}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
