# Translation Quiz App

A modern, interactive web application for practicing Hindi-to-English translations with voice recognition, customizable quizzes, and real-time feedback.

## Features

### 🎯 Core Functionality
- **Dynamic Question Loading** - Automatically detects and loads JSON files from the root directory
- **Random Question Order** - Fisher-Yates shuffle algorithm ensures unique quiz experiences
- **Category Filtering** - Select specific categories to focus your practice
- **Customizable Quiz Length** - Choose from 20 to 500 questions (or custom amount)
- **Adjustable Timer** - Set time limits from 30s to 80s per question

### 🎤 Voice Features
- **Speech Recognition** - Speak your answers using the microphone (Chrome recommended)
- **Text-to-Speech** - Hindi questions are read aloud automatically
- **Voice Controls** - Toggle speaker and microphone with keyboard shortcuts
- **Real-time Transcription** - See your spoken words appear as you speak

### 🎨 User Interface
- **Dark/Light Theme** - Toggle between themes with persistent preference
- **Mobile Responsive** - Optimized layouts for phones, tablets, and desktops
- **Modern Design** - Glassmorphism effects, smooth animations, and gradient accents
- **Progress Tracking** - Visual progress bar and question counter

### 📊 Performance Tracking
- **Live Score** - Real-time score updates as you answer
- **Streak Counter** - Track consecutive correct answers
- **Mistake Review** - Review all incorrect answers at the end
- **Retry Mode** - Practice only the questions you got wrong

## Getting Started

### Prerequisites
- Modern web browser (Chrome recommended for voice features)
- VS Code with Live Server extension (for local development)

### Installation

1. Clone or download this repository
2. Add your JSON question files to the root directory
3. Open the folder in VS Code
4. Click "Go Live" to start the Live Server
5. The app will open in your browser

### JSON File Format

Create JSON files with the following structure:

```json
[
  {
    "hindi": "मैं स्कूल जाता हूँ।",
    "english": "I go to school",
    "categories": "Simple Present"
  },
  {
    "hindi": "वह किताब पढ़ रही है।",
    "english": "She is reading a book",
]    "categories": "Present Continuous"
  }
]
```

### Supported JSON Files
The app automatically detects these files in the root directory:
- `tense.json`
- `tenses.json`
- `upsc.json`
- `vocabulary.json`
- `grammar.json`
- `verbs.json`

## Usage

### Starting a Quiz
1. Select your topic from the dropdown
2. Choose number of questions (20, 30, 40, or 60)
3. Set your preferred timer (30s, 45s, 60s, or 80s)
4. Select categories you want to practice (or keep all selected)
5. Click "Start Practice"

### Answering Questions
- **Type** your answer in the input field
- **Speak** your answer by clicking the microphone button
- Press **Enter** to check your answer
- Press **Space** to move to the next question

### Keyboard Shortcuts
- `Enter` - Check answer / Start quiz
- `Space` - Next question
- `ArrowDown` - Toggle microphone
- `ArrowUp` - Toggle speaker (mute/unmute Hindi audio)
- `M` - Toggle microphone

### Theme Toggle
Click the moon/sun icon in the top-right corner to switch between dark and light themes. Your preference is saved automatically.

### Speaker Control
Click the speaker icon to mute/unmute Hindi audio. The icon turns gray when muted. This setting is also saved for future sessions.

## Mobile Optimization

The app is fully responsive with special optimizations for mobile devices:
- Compact layouts for small screens
- Touch-optimized buttons and controls
- Prevents iOS zoom on input focus
- Landscape mode support
- Hidden options on mobile (60 questions, 80s timer) for cleaner UI

## Browser Compatibility

- **Chrome/Edge** - Full support including voice recognition
- **Firefox** - Full support except voice recognition
- **Safari** - Full support except voice recognition
- **Mobile Browsers** - Full support with touch optimization

## File Structure

```
.
├── index.html          # Main HTML structure
├── style.css           # All styling and themes
├── script.js           # Application logic
├── tense.json          # Question data (example)
└── README.md           # Documentation
```

## Technical Details

### Technologies Used
- Vanilla JavaScript (ES6+)
- CSS3 with custom properties
- Web Speech API (Speech Recognition & Synthesis)
- LocalStorage for preferences
- Fetch API for dynamic file loading

### Key Features Implementation
- **Speech Recognition**: Uses Web Speech API for voice input
- **Text-to-Speech**: Synthesizes Hindi audio with Indian voice preference
- **Theme Persistence**: LocalStorage saves user theme preference
- **Responsive Design**: CSS media queries for multiple breakpoints
- **Answer Normalization**: Removes punctuation and articles for flexible matching

## Customization

### Adding New JSON Files
1. Create a JSON file with the required format
2. Add the filename to the `jsonFilesToCheck` array in `script.js`
3. Place the file in the root directory

### Modifying Themes
Edit CSS custom properties in `style.css`:
```css
:root {
    --accent: #6366f1;
    --accent2: #8b5cf6;
    --success: #22c55e;
    --danger: #ef4444;
    /* ... more variables */
}
```

## Troubleshooting

### Questions Not Loading
- Ensure you're using Live Server (not opening HTML directly)
- Check that JSON files are in the root directory
- Verify JSON syntax is valid

### Voice Recognition Not Working
- Use Chrome or Edge browser
- Allow microphone permissions when prompted
- Check that your microphone is working

### Audio Not Playing
- Check browser audio permissions
- Ensure speaker toggle is not muted (colored icon)
- Try clicking the Hindi question to replay audio

## License

This project is open source and available for personal and educational use.

