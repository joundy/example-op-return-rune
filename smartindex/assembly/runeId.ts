export type RuneIdKey = string;

export class RuneId {
  block: u64;
  tx: u32;

  constructor(block: u64, tx: u32) {
    this.block = block;
    this.tx = tx;
  }

  static default(): RuneId {
    return changetype<RuneId>(0);
  }

  static fromKey(key: RuneIdKey): RuneId {
    const splits = key.split(":");
    if (splits.length !== 2) {
      throw new Error("errors: rune id is not valid");
    }

    return new RuneId(<u64>parseInt(splits[0]), <u32>parseInt(splits[1]));
  }

  toKey(): RuneIdKey {
    return `${this.block}:${this.tx}`;
  }
}
