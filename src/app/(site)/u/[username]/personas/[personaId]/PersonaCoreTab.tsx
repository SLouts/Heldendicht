export type PersonaField = { label: string; value: string };

/** 「本尊核心」分頁的主內容——玩家自訂的 fields(性別/生日等)+ 長文簡介。 */
export function PersonaCoreTab({ fields, bio }: { fields: PersonaField[]; bio: string | null }) {
  return (
    <div>
      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {fields.map((f, i) => (
            <div key={i} className="flex gap-1.5">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {bio ? (
        <p className="mt-4 whitespace-pre-wrap text-sm">{bio}</p>
      ) : (
        fields.length === 0 && (
          <p className="text-sm text-muted-foreground">這個角色還沒有填寫本尊簡介。</p>
        )
      )}
    </div>
  );
}
