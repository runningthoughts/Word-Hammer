# Word Hammer
Word Hammer is a tool for helping you to perfect a problem area in a foreign language that you are learning.  It is a tool that uses, initially, the SambaNova APIs and the Llama 3.1 405B model to generate a list of quiz questions that you can use to practice your problem area.  The list is, technically, infinite, but are fetched 20 at a time.  This can be used for any language, since you simply type the language you are learning.

Example:  "I need help with por/para, as they can be confusing to English speakers"
Example:  "Both Salir and Dejar and Irse can mean leaving or going out, and I would like to practice them to learn them better"

This is pretty much the solution for now.  It does track your progress, and after you have answered 20 questions, it will fetch 20 more.  You can also use the "reset" button to start over.  After 20 questions, a meter that shows your correct percentage for the last 20 questions is displayed.  Getting to 100% for the last 20 questions is a good indicator that you have mastered the problem area.

## Known Issues
- If you use <Return> to submit your answer, you must keep using the <Return> key. If you use the Continue button, you must keep using the Continue button.  If you change modes, you will either see the app stop checking your answers, or double-skipping questions, depending on which mode you used first.  This is planned to be fixed in the future.
- For now, for the same prompt, SambaNova will return the same questions.

### If you decide to use the code yourself, you will need to add your own API key to the PHP code.  You can get one from SambaNova.
