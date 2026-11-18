import { Modal } from "./Modal";
import { Tile } from "./Tile";

export function HelpModal({ maxGuesses, onClose }: { maxGuesses: number; onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Guess today's mystery <b>Western University</b> building in {maxGuesses} tries. Every guess tells you how
          close you are.
        </p>
        <p>
          You start with a free <b>clue</b>: the building's type. Missing unlocks more: its zone after 2 guesses, the
          decade it was built after 4, and its first letter after 5.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Tile label="Zone" value="Core" match="correct" />
          <Tile label="Built" value={1969} match="close" hint="higher" />
          <Tile label="Type" value="Library" match="wrong" />
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li><b className="text-purple-western dark:text-purple-300">Purple</b>: exact match.</li>
          <li><b className="text-close">Gold</b>: close — within 10 years built, or 1 floor.</li>
          <li><b>▲ / ▼</b>: the answer is higher or lower.</li>
          <li>The distance and arrow point from your guess to the answer. <b>Near</b> is how close you are across campus.</li>
        </ul>
        <p>
          <b>📷 Photo</b> mode starts on a blurry close-up of a building. Every miss zooms out a little more.
        </p>
        <p>
          <b>🔥 Endless</b>: buildings back to back with just 3 guesses each, and a new clue after every miss. See how many you can get in a row; one miss ends the run.
        </p>
        <p>New Daily and Photo buildings every day at midnight (London, ON time).</p>
        <p className="text-xs text-silver">Fan-made. Not affiliated with or endorsed by Western University.</p>
      </div>
    </Modal>
  );
}
