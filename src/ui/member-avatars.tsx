import { Avatar } from "./avatar";
import { memberColour } from "./member-colour";
import styles from "./member-avatars.module.css";

/**
 * Just enough of a Member to draw one: who they are and what to call them.
 * Structural rather than the domain's `SpaceMember`, so the component library
 * stays something screens use and not something that knows what a Space is.
 */
export type AvatarMember = {
  id: string;
  name: string;
};

export type MemberAvatarsProps = {
  /** Everyone in the Space, in the order the Space's rows name them. */
  members: readonly AvatarMember[];
};

/**
 * Who is in a Space, as overlapping circles (#38).
 *
 * They overlap rather than sitting apart because that is what says "these two
 * share this" at a glance and in almost no width — a Space card has room for a
 * pair of initials and not for two names. The names have not been dropped,
 * only moved: every circle carries its Member's whole name for anybody who is
 * not reading the colours.
 *
 * The overlap itself is a sibling rule in the stylesheet rather than a class
 * counted out here, because it is a fact about circles standing next to each
 * other and not about any one Member. The ring is a prop, because it is: it
 * appears only where there is a circle behind to be lifted off, and on a
 * personal Space it would draw a seam where nothing is joined.
 */
export function MemberAvatars({ members }: MemberAvatarsProps) {
  const ids = members.map((member) => member.id);
  const overlapping = members.length > 1;

  return (
    <div className={styles.stack}>
      {members.map((member) => (
        <Avatar
          key={member.id}
          name={member.name}
          colour={memberColour(member.id, ids)}
          size="sm"
          ringed={overlapping}
        />
      ))}
    </div>
  );
}
