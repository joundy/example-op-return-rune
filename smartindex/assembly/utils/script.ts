import { Box } from "./box";

export function parsePrimitive<T>(data: Box): T {
  const result = load<T>(data.start);
  data.shrinkFront(sizeof<T>());
  return result;
}

export function parseBytes(data: Box, sz: usize): Box {
  const result = data.sliceFrom(0);
  result.len = sz;
  data.shrinkFront(sz);
  return result;
}

export function scriptParse(data: Box): Array<Box> {
  let stack = new Array<Box>();
  let view = data.sliceFrom(0);

  while (view.len > 0) {
    let value = parsePrimitive<u8>(view);

    let opcode = new Box(usize.MAX_VALUE, <usize>value);
    if (value >= 0x01 && value <= 0x4e) {
      switch (value) {
        case 0x4c:
          stack.push(parseBytes(view, <usize>parsePrimitive<u8>(view)));
          break;
        case 0x4d:
          stack.push(parseBytes(view, <usize>parsePrimitive<u16>(view)));
          break;
        case 0x4e:
          stack.push(parseBytes(view, <usize>parsePrimitive<u32>(view)));
          break;
        default:
          stack.push(parseBytes(view, <usize>value));
      }
    } else {
      stack.push(opcode);
    }
  }
  return stack;
}
