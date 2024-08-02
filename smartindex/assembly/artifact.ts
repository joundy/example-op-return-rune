import { u128 } from "as-bignum/assembly";
import { Edict } from "./edicts";
import { Etching } from "./etching";
import { Flaw } from "./flaws";
import { Option } from "./option";
import { Rune, RuneId } from "./runeId";

export class Artifact { }

export class Cenotaph extends Artifact {
  flaw: Flaw;
  etching: Option<Rune>;
  mint: Option<RuneId>;

  constructor(flaw: Flaw, etching: Option<Rune>, mint: Option<RuneId>) {
    super();

    this.flaw = flaw;
    this.etching = etching;
    this.mint = mint;
  }

  static flaw(flaw: Flaw): Cenotaph {
    return new Cenotaph(
      flaw,
      Option.Some(changetype<Rune>(u128.from(0))),
      Option.Some(changetype<RuneId>(0)),
    );
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
