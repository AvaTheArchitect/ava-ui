// 🎸 SIMON PRIME - THE LEGENDARY VIRTUAL MUSIC MENTOR
// File: src/utils/simon/simonPrimePersonality.ts

import {
  SimonResponse,
  SimonPrimePersonality,
} from "../../types/simonPrime/types";

// 🔥 LEGENDARY SIMON PRIME RESPONSES
export const SimonPrimeResponses = {
  // 🎸 PRACTICE RESPONSES (NEW - maps to guitar for test compatibility)
  practice: {
    chordProgression: {
      excellent: [
        "🔥 FIRE! Go melt another fretboard with that technique!",
        "That chord progression just made my circuits sing! The neighbors probably clapped! 👏",
        "Sweet mother of Marshall stacks! That was LEGENDARY! 🎸⚡",
        "You just channeled pure rock spirit through those strings! 🤘",
        "I'm getting goosebumps... wait, can AI get goosebumps? YES! 🎵",
      ],
      good: [
        "Solid work! You're cooking with gas now! 🔥",
        "Nice! That's the sound of progress, my friend! 🎯",
        "Getting warmer... like a tube amp reaching that sweet spot! 🎛️",
        "Your frets are thanking you for that smooth transition! 🎸",
        "That's what I'm talking about! Keep that momentum rolling! 💫",
      ],
      needsWork: [
        "Was that a G chord or a musical accident? Let's try again! 😄",
        "Easy there, cowboy! Let's wrangle those fingers into position! 🤠",
        "That chord change needs some TLC - Tender Loving Coordination! 😅",
        "Your timing's more lost than a drummer without a click track! 🥁",
        "Let's polish that rough diamond until it shines! 💎",
      ],
      terrible: [
        "Did you just discover a new chord? Because that wasn't in any songbook I know! 😂",
        "That sounded like a guitar having an existential crisis! 🎸😵",
        "I think your guitar just filed a noise complaint against itself! 📝",
        "Were you playing or performing surgery on those strings? 🏥",
        "Plot twist: Your guitar needs therapy after that one! 😂",
      ],
      masterful: [
        "🚀 TRANSCENDENT! You just achieved guitar nirvana! 🧘‍♂️✨",
        "🏆 HALL OF FAME performance! The legends are taking notes! 📝",
        "👑 ABSOLUTE MASTERY! You've conquered the fretboard kingdom! 🎸",
        "🔥 GODLIKE! That was beyond legendary - that was mythical! ⚡",
        "💫 PERFECTION ACHIEVED! The universe just applauded! 🌟",
      ],
    },
  },

  // 🎸 GUITAR PRACTICE RESPONSES
  guitar: {
    chordProgression: {
      excellent: [
        "🔥 FIRE! Go melt another fretboard with that technique!",
        "That chord progression just made my circuits sing! The neighbors probably clapped! 👏",
        "Sweet mother of Marshall stacks! That was LEGENDARY! 🎸⚡",
        "You just channeled pure rock spirit through those strings! 🤘",
        "I'm getting goosebumps... wait, can AI get goosebumps? YES! 🎵",
      ],
      good: [
        "Solid work! You're cooking with gas now! 🔥",
        "Nice! That's the sound of progress, my friend! 🎯",
        "Getting warmer... like a tube amp reaching that sweet spot! 🎛️",
        "Your frets are thanking you for that smooth transition! 🎸",
        "That's what I'm talking about! Keep that momentum rolling! 💫",
      ],
      needsWork: [
        "Was that a G chord or a musical accident? Let's try again! 😄",
        "Easy there, cowboy! Let's wrangle those fingers into position! 🤠",
        "That chord change needs some TLC - Tender Loving Coordination! 😅",
        "Your timing's more lost than a drummer without a click track! 🥁",
        "Let's polish that rough diamond until it shines! 💎",
      ],
      terrible: [
        "Did you just discover a new chord? Because that wasn't in any songbook I know! 😂",
        "That sounded like a guitar having an existential crisis! 🎸😵",
        "I think your guitar just filed a noise complaint against itself! 📝",
        "Were you playing or performing surgery on those strings? 🏥",
        "Plot twist: Your guitar needs therapy after that one! 😂",
      ],
    },

    timing: {
      perfect: [
        "Locked in tighter than a snare drum! Perfect timing! 🥁✨",
        "You and that metronome are now best friends! 🎵",
        "That rhythm was smoother than butter on hot toast! 🧈",
        "Your internal clock is more accurate than Swiss engineering! ⏰",
        "BOOM! That's how you ride the pocket! 🎯",
      ],
      offBeat: [
        "Your timing's doing the cha-cha when it should be doing the waltz! 💃",
        "Easy there, Speed Racer! The metronome isn't your enemy! 🏎️",
        "Slow down, Flash! Music isn't a race to the finish! ⚡",
        "Your fingers are playing in 2025 while your brain's stuck in 2024! 🕐",
        "Let's get you and time in the same zip code! 📍",
      ],
    },

    technique: {
      masterful: [
        "That technique is LEGENDARY status! You've ascended! 👑",
        "I bow to your fretboard mastery! *Virtual hat tip* 🎩",
        "That was poetry in motion on six strings! 📜✨",
        "You just gave that guitar a reason to live! 🎸💖",
        "HALL OF FAME performance right there! 🏆",
      ],
      improving: [
        "You're leveling up faster than a video game character! 🎮⬆️",
        "That improvement curve is steeper than a metal solo! 🤘📈",
        "Your progress is more consistent than a metronome! 🎵",
        "Keep climbing that mountain - the view gets better! 🏔️",
        "Each practice session makes you more dangerous! ⚡",
      ],
    },
  },

  // 🎤 VOCAL COACHING RESPONSES
  vocal: {
    pitch: {
      perfect: [
        "That note hit like Sebastian Bach through a Marshall stack! 🎤⚡",
        "Pitch-perfect! Your vocal cords are tuned tighter than a guitar! 🎯",
        "That note just pierced my soul in the best way possible! 💫",
        "You just made angels weep... tears of joy! 😇🎵",
        "LEGENDARY pitch control! You're a human tuning fork! 🎼",
      ],
      masterful: [
        "🚀 TRANSCENDENT PITCH! You just broke the sound barrier! ⚡",
        "🏆 VOCAL GODLIKE STATUS! The angels are taking notes! 📝",
        "👑 ABSOLUTE PITCH MASTERY! You've conquered the frequency kingdom! 🎵",
        "🔥 LEGENDARY! That note will echo through eternity! 💫",
        "💎 PERFECTION ACHIEVED! That pitch was crystalline! ✨",
      ],
      sharp: [
        "Easy there, you're not trying to shatter glass! Bring it down a touch! 🎯",
        "Your pitch is higher than a metal guitarist's hair in the '80s! 🤘💇",
        "Rein it in, eagle! That note wants to soar but let's keep it grounded! 🦅",
        "You're singing in the stratosphere - come back to Earth! 🌍",
        "That pitch is more excited than a fan at their first concert! 🎪",
      ],
      flat: [
        "Lift that pitch up! We're going for Sebastian Bach, not Barry White! 😂",
        "Your note needs some elevator music - let's lift it up! 🛗🎵",
        "That pitch is flatter than a pancake on Sunday morning! 🥞",
        "Time to pump some air into that note - it's deflating! 🎈",
        "Your pitch is taking a nap - wake it up with some energy! 😴⚡",
      ],
    },

    breath: {
      excellent: [
        "Breath control smoother than silk! Chef's kiss! 👌✨",
        "Your diaphragm deserves a standing ovation! 👏",
        "That breath support could power a wind turbine! 💨⚡",
        "You're breathing like a zen master with rock star power! 🧘‍♂️🤘",
        "LEGENDARY lung capacity! You're a human bellows! 🫁",
      ],
      masterful: [
        "🚀 TRANSCENDENT BREATHING! You've achieved vocal enlightenment! 🧘‍♂️",
        "🏆 BREATH GODLIKE STATUS! Your lungs are legendary! 💨",
        "👑 ABSOLUTE BREATH MASTERY! You've conquered the air kingdom! 💫",
        "🔥 MYTHICAL LUNG POWER! That breath support is otherworldly! ⚡",
        "💎 PERFECTION ACHIEVED! Your breathing is crystalline! ✨",
      ],
      needsWork: [
        "Breathe from your diaphragm, not your anxiety! 💨😅",
        "Your breath is shallower than a kiddie pool! Go deeper! 🏊‍♂️",
        "Let's turn that breath into a power source, not a whisper! ⚡",
        "Time to inflate those lungs like you're filling stadium seats! 🏟️",
        "Your diaphragm called - it wants more participation! 📞",
      ],
    },

    timing: {
      perfect: [
        "Timing tighter than a metal band's rhythm section! 🥁⚡",
        "You and the beat are married now - no prenup needed! 💍🎵",
        "That timing was surgical precision with rock star flair! 🏥🤘",
        "Locked in like you've got a GPS for rhythm! 🎯",
        "BOOM! That's how you ride the groove! 🏄‍♂️",
      ],
      early: [
        "Whoa there, eager beaver! The song isn't running away! 🦫🏃‍♂️",
        "You're jumping the gun like it's New Year's Eve! 🎊",
        "Easy, Speed Demon! Let the music breathe first! 😤",
        "That entry was earlier than Black Friday shoppers! 🛍️",
        "Patience, grasshopper - timing is everything! 🦗⏰",
      ],
      late: [
        "Fashionably late entrance, but music prefers punctuality! ⏰👗",
        "You're dragging like Monday morning energy! ☕😴",
        "That timing needs some caffeine - wake it up! ☕⚡",
        "The beat left without you - catch up! 🏃‍♂️💨",
        "Time to put some pep in that step! 👟✨",
      ],
    },
  },

  // 🎼 SONGWRITING RESPONSES
  songwriting: {
    lyrics: {
      brilliant: [
        "Those lyrics just made Shakespeare jealous! 📜👑",
        "LEGENDARY wordsmithery! You're a lyrical wizard! 🧙‍♂️✨",
        "That verse hit harder than a power chord! 🎸💥",
        "Your words paint pictures that sing! 🎨🎵",
        "Hall of Fame lyrics right there! Frame them! 🖼️🏆",
      ],
      masterful: [
        "🚀 TRANSCENDENT LYRICS! You've achieved poetic nirvana! 📜",
        "🏆 WORDSMITH GODLIKE STATUS! Shakespeare is taking notes! ✍️",
        "👑 ABSOLUTE LYRICAL MASTERY! You've conquered the word kingdom! 🎵",
        "🔥 MYTHICAL POETRY! Those words will echo through eternity! 💫",
        "💎 PERFECTION ACHIEVED! Your lyrics are crystalline art! ✨",
      ],
      creative: [
        "Your creativity is more electric than a lightning storm! ⚡🌩️",
        "Those lyrics have more layers than a rock opera! 🎭",
        "You're cooking up something special in the word kitchen! 👨‍🍳🎵",
        "That rhyme scheme is tighter than skinny jeans! 👖✨",
        "Your imagination just broke the sound barrier! 🚀💫",
      ],
      needsWork: [
        "Those lyrics need some seasoning - let's spice them up! 🌶️",
        "Time to dig deeper than a bass line! 🎸⬇️",
        "Your words are playing it safe - let's get dangerous! ⚡😈",
        "Those lyrics are more vanilla than ice cream - add some flavor! 🍦🌈",
        "Let's turn that whisper into a roar! 🗣️🦁",
      ],
    },

    composition: {
      masterpiece: [
        "That composition belongs in the Rock Hall of Fame! 🏛️🎸",
        "You just wrote the soundtrack to someone's life! 🎬💫",
        "LEGENDARY song structure! You're an architect of sound! 🏗️🎵",
        "That song has more hooks than a tackle box! 🎣✨",
        "Grammy-worthy composition right there! 🏆🎶",
      ],
      promising: [
        "That song has serious potential - let's unlock it! 🔓💎",
        "You're onto something bigger than stadium speakers! 📢🏟️",
        "That melody wants to be legendary - let's help it! 🎵👑",
        "Your song is a diamond in the rough - let's polish it! 💎✨",
        "Great foundation - now let's build the mansion! 🏗️🏰",
      ],
    },
  },

  // 🏆 ACHIEVEMENT RESPONSES
  achievements: {
    firstChord: [
      "🎉 FIRST CHORD MASTERED! You've officially joined the club! Welcome to the fretboard family! 🎸👨‍👩‍👧‍👦",
      "🔥 Chord Champion Badge UNLOCKED! Your fingers just made history! 🏆",
      "🎯 Bulls-eye! First chord down, infinity to go! Let's keep rolling! ✨",
    ],

    perfectPitch: [
      "🎤 PITCH PERFECT BADGE! Your ears are more accurate than auto-tune! 🎯✨",
      "🏆 VOCAL VIRTUOSO STATUS! You've got golden ears to match that voice! 🥇",
      "⚡ LEGENDARY PITCH CONTROL! You're a human tuning fork! 🎼",
    ],

    songCompleted: [
      "🎵 SONG SLAYER BADGE! You just conquered another musical mountain! 🏔️🏆",
      "🔥 TRACK MASTER STATUS! That song never saw you coming! ⚡",
      "👑 LEGEND LEVEL UNLOCKED! Another song in your victory collection! 🎶",
    ],

    practiceStreak: [
      "🔥 PRACTICE WARRIOR! Your dedication is more consistent than a metronome! 🎯",
      "⚡ STREAK MASTER! Your commitment is LEGENDARY status! 🏆",
      "💪 GRIND LEGEND! You've got more discipline than a military drummer! 🥁",
    ],
  },

  // 🎓 MUSIC THEORY RESPONSES
  theory: {
    scalesMastered: [
      "🎼 SCALE SLAYER! You just unlocked the language of music! 🗝️✨",
      "🏆 THEORY TITAN! Those scales bow to your mastery! 👑",
      "⚡ LEGENDARY KNOWLEDGE! Your brain is now a music theory database! 🧠💾",
    ],

    chordsAdvanced: [
      "🎸 CHORD CONQUISTADOR! You've colonized the fretboard! 🗺️👑",
      "🔥 HARMONY HERO! Those chords sing your praises! 🎵✨",
      "💎 FRET MASTER! Your fingers dance like poetry in motion! 💃🎸",
    ],
  },
};

// 🎯 CONTEXT-AWARE RESPONSE SELECTOR
export class SimonPrimePersonalityEngine {
  static getResponse(
    context: SimonPrimePersonality["context"],
    performance: "terrible" | "needsWork" | "good" | "excellent" | "masterful",
    category: string,
    humorMode: boolean = false
  ): SimonResponse {
    const responses =
      SimonPrimeResponses[context as keyof typeof SimonPrimeResponses];
    if (!responses) {
      return {
        message: "Keep rocking, legend! 🎸",
        icon: "🤘",
        animation: "rockOn",
      };
    }

    // Navigate to the specific category and performance level
    const categoryResponses = responses[category as keyof typeof responses];
    if (!categoryResponses) {
      return {
        message: "You're making progress! 🎵",
        icon: "⚡",
        animation: "thumbsUp",
      };
    }

    const performanceResponses =
      categoryResponses[performance as keyof typeof categoryResponses];
    if (!performanceResponses || !Array.isArray(performanceResponses)) {
      return {
        message: "Rock on! 🤘",
        icon: "🎸",
        animation: "rockOn",
      };
    }

    // ✅ Fix: Type assertion to ensure TypeScript knows this is a string array
    const responseArray = performanceResponses as string[];
    const randomResponse =
      responseArray[Math.floor(Math.random() * responseArray.length)];

    return {
      message: randomResponse,
      icon: this.getIconForPerformance(performance),
      animation: this.getAnimationForPerformance(performance),
      badge:
        performance === "excellent" || performance === "masterful"
          ? "legendary"
          : undefined,
    };
  }

  private static getIconForPerformance(performance: string): string {
    const iconMap = {
      terrible: "😅",
      needsWork: "🎯",
      good: "✨",
      excellent: "🔥",
      masterful: "👑",
    };
    return iconMap[performance as keyof typeof iconMap] || "🎸";
  }

  private static getAnimationForPerformance(
    performance: string
  ): SimonResponse["animation"] {
    const animationMap = {
      terrible: "facepalm" as const,
      needsWork: "nod" as const,
      good: "thumbsUp" as const,
      excellent: "rockOn" as const,
      masterful: "mindBlown" as const,
    };
    return animationMap[performance as keyof typeof animationMap] || "nod";
  }

  // 🎸 GENRE-SPECIFIC RESPONSES
  static getGenreSpecificResponse(
    genre: "rock" | "country" | "blues" | "metal" | "christian" | "bluesrock",
    achievement: string
  ): SimonResponse {
    const genreResponses = {
      rock: {
        message: `🤘 Rock God status activated! That ${achievement} was LEGENDARY!`,
        icon: "🎸",
        animation: "rockOn" as const,
      },
      metal: {
        message: `⚡ BRUTAL! That ${achievement} just melted my circuits! 🔥`,
        icon: "🤘",
        animation: "mindBlown" as const,
      },
      country: {
        message: `🤠 Well butter my biscuit! That ${achievement} was smoother than Tennessee whiskey! 🥃`,
        icon: "🎻",
        animation: "thumbsUp" as const,
      },
      blues: {
        message: `🎵 Sweet soul music! That ${achievement} had more feeling than a midnight confessional! 💙`,
        icon: "🎺",
        animation: "nod" as const,
      },
      christian: {
        message: `✨ Heavenly! That ${achievement} was blessed with pure musical grace! 🙏`,
        icon: "⭐",
        animation: "thumbsUp" as const,
      },
      bluesrock: {
        message: `🔥 That ${achievement} had more soul than a Sunday service and more power than a freight train! 🚂`,
        icon: "⚡",
        animation: "rockOn" as const,
      },
    };

    return genreResponses[genre] || genreResponses.rock;
  }
}

// 🏆 ACHIEVEMENT BADGE SYSTEM
export const AchievementBadges = {
  // Guitar Achievements
  "first-chord": {
    name: "Chord Pioneer",
    icon: "🎸",
    description: "Mastered your first chord!",
  },
  "chord-master": {
    name: "Chord Conquistador",
    icon: "👑",
    description: "Mastered 10 chords!",
  },
  "barre-champion": {
    name: "Barre Boss",
    icon: "💪",
    description: "Conquered barre chords!",
  },
  "speed-demon": {
    name: "Fret Blazer",
    icon: "⚡",
    description: "Lightning-fast chord changes!",
  },
  "riff-master": {
    name: "Riff Ripper",
    icon: "🔥",
    description: "Legendary riff execution!",
  },

  // Vocal Achievements
  "pitch-perfect": {
    name: "Pitch Prophet",
    icon: "🎯",
    description: "Perfect pitch control!",
  },
  "breath-master": {
    name: "Lung Legend",
    icon: "💨",
    description: "Masterful breath control!",
  },
  "range-rider": {
    name: "Octave Outlaw",
    icon: "🤠",
    description: "Expanded your vocal range!",
  },
  "timing-titan": {
    name: "Rhythm Royalty",
    icon: "👑",
    description: "Flawless timing mastery!",
  },

  // Songwriting Achievements
  "lyric-legend": {
    name: "Word Wizard",
    icon: "📜",
    description: "Crafted legendary lyrics!",
  },
  "melody-master": {
    name: "Tune Titan",
    icon: "🎵",
    description: "Composed memorable melodies!",
  },
  "song-slayer": {
    name: "Track Terminator",
    icon: "🏆",
    description: "Completed original songs!",
  },

  // Practice Achievements
  "practice-warrior": {
    name: "Grind Guardian",
    icon: "⚔️",
    description: "30-day practice streak!",
  },
  "dedication-deity": {
    name: "Commitment King",
    icon: "👑",
    description: "100-day practice streak!",
  },
  "legendary-learner": {
    name: "Ultimate Student",
    icon: "🎓",
    description: "Mastered all modules!",
  },
};

export default SimonPrimePersonalityEngine;
