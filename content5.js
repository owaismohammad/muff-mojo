function createEmojiTooltip() {
    const tooltip = document.createElement('span');
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    tooltip.style.borderRadius = '5px';
    tooltip.style.padding = '5px';
    tooltip.style.fontSize = '24px';
    tooltip.style.zIndex = '9999';
    document.body.appendChild(tooltip);
    return tooltip;
}

function getEmojiList() {
    return {
      
            // Popular emojis
            hug:'🫂',
            tick:'✅',
            correct:'✅',
            wrong:'❌',
            incorrect:'❌',
            smile: '😀',
            laugh: '😂',
            heart: '❤️',
            wink: '😉',
            thumbs: '👍',
            star: '⭐',
            fire: '🔥',
            party: '🎉',
            kiss: '😘',
            sun: '☀️',
            moon: '🌙',
            cloud: '☁️',
            rainbow: '🌈',
            cat: '🐱',
            dog: '🐶',
            elephant: '🐘',
            lion: '🦁',
            flower: '🌸',
            tree: '🌳',
            car: '🚗',
        
            // Face emojis
            heart_eyes: '😍',
            blush: '😊',
            smirk: '😏',
            relieved: '😌',
            thinking: '🤔',
            sweat_smile: '😅',
            upside_down: '🙃',
            joy: '🤣',
            crying: '😢',
            sleepy: '😴',
            angry: '😡',
            shocked: '😱',
            scream: '😱',
            astonished: '😲',
            sunglasses: '😎',
            nerd: '🤓',
            facepalm: '🤦',
            shrug: '🤷',
            hugging: '🤗',
            party_face: '🥳',
            
            happy: '😊',
            grin: '😁',
            joyful: '😁',
            laugh: '😂',
            annoyed:'😑',
            wink: '😉',
            playful: '😉',
            shy: '😊',
            love: '😍',
            teasing: '😏',
            relaxed: '😌',
            sweatSmile: '😅',
            pondering: '🤔',
            asleep: '😴',
            sad_teary: '😢',
            sad:'😔',
            cool: '😎',
            mad: '😡',
            dizzy: '😵',
            stunned: '😵',
            celebration: '🥳',
            caring: '🤗',
            quiet: '🤫',
            embarrassed: '😳',
            upset: '😞',
            kiss: '😘',
            affection: '😘',
            tongueOut: '😜',
            silly: '😜',
            sick: '🤢',
            nauseated: '🤢',
            studious: '🤓',
            disbelief: '🤦',
            sneezing: '🤧',
            clown: '🤡',
            dead: '💀',
            pleading: '🥺',
            begging: '🥺',
            melting: '🫠',
            overwhelmed: '🫠',
            salute: '🫡',
            respect: '🫡',
            knife:'🔪',
            sword:'🗡️',
            knight:'🤺',
            // Hand emojis
            thumbs_up: '👍',
            thumbs_down: '👎',
            clap: '👏',
            pray: '🙏',
            ok: '👌',
            peace: '✌️',
            fist: '✊',
            raised_hand: '✋',
            fingers_crossed: '🤞',
            wave: '👋',
            call_me: '🤙',
            writing_hand: '✍️',
            muscle: '💪',
            handshake: '🤝',
            point_up: '☝️',
            point_down: '👇',
            point_left: '👈',
            point_right: '👉',
            victory: '✌️',
            fingers_crossed: '🤞',
            raised_back_hand: '🤚',
        
            // Food emojis
            apple: '🍎',
            banana: '🍌',
            grapes: '🍇',
            watermelon: '🍉',
            orange: '🍊',
            pineapple: '🍍',
            strawberry: '🍓',
            cherries: '🍒',
            peach: '🍑',
            lemon: '🍋',
            melon: '🍈',
            pizza: '🍕',
            hamburger: '🍔',
            hotdog: '🌭',
            fries: '🍟',
            spaghetti: '🍝',
            taco: '🌮',
            burrito: '🌯',
            popcorn: '🍿',
            cake: '🍰',
            icecream: '🍦',
            doughnut: '🍩',
            cookie: '🍪',
            coffee: '☕',
            tea: '🍵',
            wine_glass: '🍷',
            beer: '🍺',
            cocktail: '🍸',
            sushi: '🍣',
            ramen: '🍜',
        
            // Gen Z emojis
            skull: '💀',          // Used to indicate something is very funny or "I'm dead" with laughter
            cry: '😭',     // Expresses overwhelming emotion (often humor or extreme feels)
            pleads: '🥺',   // Used to convey a cute, begging, or soft expression
            sparkles: '✨',        // Adds excitement or emphasis, often sarcastic
            clown: '🤡',           // Used to show that something or someone is silly or ridiculous
            eyes: '👀',            // Used to express looking at something or paying close attention
            hundred: '💯',         // "Keep it real" or approval
            nails: '💅',     // Conveys confidence, nonchalance, or "unbothered" vibes
            melting_face: '🫠',    // Used to show awkwardness or emotional overwhelm
            smirking_cat: '😼',    // Used in a mischievous or teasing manner
            drooling_face: '🤤',   // Used for something appealing (often humorously exaggerated)
            flushed_face: '😳',    // Embarrassment or flustered reaction
            cold_face: '🥶',       // Conveys something "chilling" or cold
            explosion: '💥',       // Used to show "mind-blown" reactions
            money_mouth: '🤑',     // Used when talking about money, success, or wanting riches
            dizzy: '😵‍💫',        // Used for confusion or being overwhelmed
            cowboy: '🤠',          // Used humorously for being nonchalant or ironic
            robot: '🤖',           // Used to convey indifference or sarcasm in a "robotic" way
            fairy: '🧚',           // Whimsical, often used to add a sarcastic "fairytale" vibe
            alien: '👽',           // Used to show feeling like an outsider or being quirky
        
            // Miscellaneous Gen Z additions
            mushroom: '🍄',        // Used humorously or to convey something "trippy"
            leaf: '🍃',            // Often used to represent nature or a "chill" vibe
            crystal_ball: '🔮',    // Used to talk about the future or "vibes"
            crown: '👑',           // To say someone is a "queen" or holds high status
            black_heart: '🖤',     // Used to convey dark or ironic affection
            brain: '🧠',           // Used to show "big-brain" moments or intelligence
            butterfly: '🦋',       // Often symbolizes growth, beauty, or nostalgia
            lips: '👄',            // Used to show flirtation or sass
            cherries: '🍒',        // Sometimes used in flirty or playful contexts
            cactus: '🌵',          // Used to represent resilience or "spiky" humor
            peach:'🍑',
            // Water
            water: '💧',
            droplet: '💦',
            splash: '💦',
            rain: '🌧️',
            drizzle: '🌧️',
            downpour: '🌧️',
            umbrella: '☔',
            parasol: '☔',
            wave: '🌊',
            ocean: '🌊',
            sea: '🌊',
            sweat: '😅',
            perspiration: '😅',
            shower: '🚿',
            bath: '🛁',
            swimming: '🏊',
            snorkeling: '🤿',
            dive: '🤿',
            faucet: '🚰',
            drink: '🥤',
            glass: '🥤',
            pool: '🏊‍♂️',
            lake: '🌊',
            river: '🌊',
            fish: '🐟',
            aquatic: '🐟',
            whale: '🐳',
            orca: '🐳',
            dolphin: '🐬',
            surfing: '🏄',
            canoe: '🛶',
            boat: '⛵',
            sail: '⛵',
            person: '👤',
            people: '👥',
            baby: '👶',
            child: '🧒',
            boy: '👦',
            girl: '👧',
            man: '👨',
            woman: '👩',
            elderly: '👴',
            oldWoman: '👵',
            family: '👪',
            couple: '👫',
            kiss: '💏',
            love: '💑',
            handshake: '🤝',
            wave: '👋',
            thumbsUp: '👍',
            thumbsDown: '👎',
            clap: '👏',
            raisedHands: '🙌',
            pray: '🙏',
            flex: '💪',
            ok: '👌',
            peace: '✌️',
            writing: '✍️',
            gay:'🏳️‍🌈',
            // Fantasy
            angel: '👼',
            fairy: '🧚',
            vampire: '🧛',
            zombie: '🧟',
            mermaid: '🧜‍♀️',
            merman: '🧜‍♂️',
            elf: '🧝',
            genie: '🧞',
            ghost: '👻',
            alien: '👽',
            robot: '🤖',
            wizard: '🧙',
            witch: '🧙‍♀️',
            magic: '🪄',
            dragon: '🐉',
            unicorn: '🦄',
            // Animals
            dog: '🐶',
            puppy: '🐶',
            cat: '🐱',
            kitten: '🐱',
            mouse: '🐭',
            hamster: '🐹',
            rabbit: '🐰',
            bunny: '🐰',
            fox: '🦊',
            bear: '🐻',
            panda: '🐼',
            koala: '🐨',
            tiger: '🐯',
            lion: '🦁',
            cow: '🐮',
            pig: '🐷',
            frog: '🐸',
            monkey: '🐒',
            chicken: '🐔',
            penguin: '🐧',
            bird: '🐦',
            eagle: '🦅',
            duck: '🦆',
            owl: '🦉',
            bee: '🐝',
            bug: '🐛',
            butterfly: '🦋',
            snail: '🐌',
            crab: '🦀',
            lobster: '🦞',
            shrimp: '🦐',
            squid: '🦑',
            fish: '🐟',
            whale: '🐳',
            dolphin: '🐬',
            shark: '🦈',
            octopus: '🐙',
            turtle: '🐢',
            snake: '🐍',
            dragon: '🐉',
            unicorn: '🦄',
                
            // Nature
            tree: '🌳',
            forest: '🌲',
            palm: '🌴',
            cactus: '🌵',
            flower: '🌸',
            rose: '🌹',
            sunflower: '🌻',
            blossom: '🌼',
            seedling: '🌱',
            herb: '🌿',
            shamrock: '☘️',
            mapleLeaf: '🍁',
            fallenLeaf: '🍂',
            mushroom: '🍄',
            earth: '🌍',
            moon: '🌕',
            sun: '☀️',
            star: '⭐',
            sparkles: '✨',
            cloud: '☁️',
            lightning: '⚡',
            tornado: '🌪️',
            rainbow: '🌈',
            volcano: '🌋',
            water: '💧',
            fire: '🔥',
            ocean: '🌊'
   
    };
}

function getCaretCoordinates(editableElement) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return { x: 0, y: 0 };
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return {
        x: rect.left + rect.width,
        y: rect.top
    };
}

function showTooltip(tooltip, text, x, y) {
    tooltip.textContent = text;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y - 30}px`;
    tooltip.style.display = 'block';
}

function hideTooltip(tooltip) {
    tooltip.style.display = 'none';
}

function insertEmoji(currentNode, emojiWord, selection) {
    const range = selection.getRangeAt(0);
    const textBeforeCaret = currentNode.textContent.slice(0, range.startOffset);
    const lastSpaceIndex = textBeforeCaret.lastIndexOf(' ');
    const newText = lastSpaceIndex === -1 ? '' : textBeforeCaret.slice(0, lastSpaceIndex + 1);
    
    currentNode.textContent = newText + emojiWord;
    
    const newCaretPosition = newText.length + emojiWord.length;
    const newRange = document.createRange();
    newRange.setStart(currentNode, newCaretPosition);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

function handleInput(messageContainer, emojiList, emojiTooltip) {
    const typedText = messageContainer.innerText.trim();
    const words = typedText.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (emojiList[currentWord]) {
        const caretPosition = getCaretCoordinates(messageContainer);
        showTooltip(emojiTooltip, emojiList[currentWord], caretPosition.x, caretPosition.y);
    } else {
        hideTooltip(emojiTooltip);
    }
}

function detectTyping(messageContainer) {
    const emojiTooltip = createEmojiTooltip();
    const emojiList = getEmojiList();

    if (messageContainer) {
        messageContainer.addEventListener('input', () => handleInput(messageContainer, emojiList, emojiTooltip));

        messageContainer.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                const selection = window.getSelection();
                const currentNode = selection.getRangeAt(0).startContainer;
                
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    const textBeforeCaret = currentNode.textContent.slice(0, selection.getRangeAt(0).startOffset);
                    const lastSpaceIndex = textBeforeCaret.lastIndexOf(' ');
                    const currentWord = textBeforeCaret.slice(lastSpaceIndex + 1);
                    
                    if (emojiList[currentWord]) {
                        insertEmoji(currentNode, emojiList[currentWord], selection);
                        hideTooltip(emojiTooltip);
                    }
                }
            }
        });

        document.addEventListener('click', (event) => {
            if (!messageContainer.contains(event.target)) {
                hideTooltip(emojiTooltip);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                hideTooltip(emojiTooltip);
            }
        });
    } else {
        setTimeout(detectTyping, 1000);
    }
}

window.addEventListener('load', () => {
    document.body.addEventListener('click', function() {
        const selectorsin = ['#main footer div[contenteditable="true"]', 'div[contenteditable="true"]'];
        let inputBox;
        for (const selector of selectorsin) {
            inputBox = document.querySelector(selector);
            if (inputBox) break;
        }
        
        if (inputBox) {
            detectTyping(inputBox);
        }
    });
});