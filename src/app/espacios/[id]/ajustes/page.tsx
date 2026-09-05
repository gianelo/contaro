import { Settings } from "./settings";
import { SpaceScreen } from "../screen";
import { currentSpace } from "../space";

/**
 * Everything about a Space that is not its money.
 *
 * It exists because the tab bar has four places and the Categories catalogue
 * was spending one of them on a screen a person opens twice a year. This is
 * where that catalogue went, and where the rest of it will go.
 */
export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await currentSpace(id);

  return (
    <SpaceScreen space={space} tab="settings">
      <Settings spaceId={space.id} />
    </SpaceScreen>
  );
}
