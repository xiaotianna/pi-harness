export declare const EMOJI_SKIN_TONES: readonly [{
    readonly emoji: "✋";
    readonly id: "default";
    readonly label: "Default";
}, {
    readonly emoji: "✋🏻";
    readonly id: "light";
    readonly label: "Light";
}, {
    readonly emoji: "✋🏼";
    readonly id: "medium-light";
    readonly label: "Medium-Light";
}, {
    readonly emoji: "✋🏽";
    readonly id: "medium";
    readonly label: "Medium";
}, {
    readonly emoji: "✋🏾";
    readonly id: "medium-dark";
    readonly label: "Medium-Dark";
}, {
    readonly emoji: "✋🏿";
    readonly id: "dark";
    readonly label: "Dark";
}];
export type EmojiSkinTone = (typeof EMOJI_SKIN_TONES)[number]['id'];
export type EmojiSkinToneItem = {
    emoji: string;
    id: string;
    label: string;
};
export declare const EMOJI_CATEGORIES: readonly [{
    readonly emoji: "🕐";
    readonly id: "frequently-used";
    readonly label: "Frequently Used";
}, {
    readonly emoji: "😀";
    readonly id: "smileys-emotion";
    readonly label: "Smileys & Emotion";
}, {
    readonly emoji: "👋";
    readonly id: "people-body";
    readonly label: "People & Body";
}, {
    readonly emoji: "🐶";
    readonly id: "animals-nature";
    readonly label: "Animals & Nature";
}, {
    readonly emoji: "🍎";
    readonly id: "food-drink";
    readonly label: "Food & Drink";
}, {
    readonly emoji: "⚽";
    readonly id: "activities";
    readonly label: "Activities";
}, {
    readonly emoji: "🚗";
    readonly id: "travel-places";
    readonly label: "Travel & Places";
}, {
    readonly emoji: "💡";
    readonly id: "objects";
    readonly label: "Objects";
}, {
    readonly emoji: "🔣";
    readonly id: "symbols";
    readonly label: "Symbols";
}, {
    readonly emoji: "🏁";
    readonly id: "flags";
    readonly label: "Flags";
}];
export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number]['id'];
export type EmojiCategoryItem = {
    emoji: string;
    id: string;
    label: string;
};
//# sourceMappingURL=emoji-picker-constants.d.ts.map