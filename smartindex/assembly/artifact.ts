import { Edict } from "./edicts";
import { Etching } from "./etching";
import { Flaw } from "./flaws";
import { Option } from "./option";
import { Rune, RuneId } from "./runeId";

export class Artifact {}

export class Cenotaph extends Artifact {
  flaws: Flaw[] = [];
  etching: Option<Rune>;
  mint: Option<RuneId>;

  constructor(flaws: Flaw[], etching: Option<Rune>, mint: Option<RuneId>) {
    super();

    this.flaws = flaws;
    this.etching = etching;
    this.mint = mint;
  }
}

export class Runestone extends Artifact {
  edicts: Edict[];
  etching: Option<Etching>;
  mint: Option<RuneId>;
  pointer: Option<u32>;

  constructor(
    edicts: Edict[],
    etching: Option<Etching>,
    mint: Option<RuneId>,
    pointer: Option<u32>,
  ) {
    super();

    this.edicts = edicts;
    this.etching = etching;
    this.mint = mint;
    this.pointer = pointer;
  }
}
