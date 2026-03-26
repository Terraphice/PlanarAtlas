export const CARD_TYPES = new Map([
  ["plane", "Plane"],
  ["phenomenon", "Phenomenon"]
]);

function readOptionValue(argv, index, inlineValue) {
  if (inlineValue !== undefined) {
    return { value: inlineValue, nextIndex: index };
  }

  const next = argv[index + 1];
  if (!next || next.startsWith("--")) {
    return { value: null, nextIndex: index };
  }

  return { value: next, nextIndex: index + 1 };
}

export function parseReleaseOptions(argv = []) {
  const options = {
    classification: null,
    type: null,
    setCode: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const [flag, inlineValue] = token.split("=", 2);

    if (flag === "--official") {
      options.classification = "official";
      continue;
    }

    if (flag === "--custom") {
      options.classification = "custom";
      continue;
    }

    if (flag === "--type") {
      const { value, nextIndex } = readOptionValue(argv, i, inlineValue);
      i = nextIndex;
      if (value) {
        const normalizedType = String(value).trim().toLowerCase();
        options.type = CARD_TYPES.get(normalizedType) ?? null;
      }
      continue;
    }

    if (flag === "--set") {
      const { value, nextIndex } = readOptionValue(argv, i, inlineValue);
      i = nextIndex;
      if (value) {
        const normalizedSet = String(value).trim();
        options.setCode = normalizedSet || null;
      }
    }
  }

  return options;
}

export function releaseOptionsToArgs(options) {
  const args = [];
  if (options.type) args.push("--type", options.type);
  if (options.classification === "official") args.push("--official");
  if (options.classification === "custom") args.push("--custom");
  if (options.setCode) args.push("--set", options.setCode);
  return args;
}
