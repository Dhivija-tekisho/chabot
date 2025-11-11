# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

 {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/avatar.png"
                alt="Assistant"
                className="w-8 h-8 rounded-full border-2 border-white"
              />
              <div>
                <div className="font-semibold">Aria AI</div>
                <div className="text-xs text-blue-100 -mt-1">
                  Company Assistant
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Area */}
          {activeTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 ${
                      msg.type === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block px-3 py-2 rounded-2xl ${
                        msg.type === "assistant"
                          ? "bg-white border border-slate-200 text-slate-800"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {msg.type === "assistant" ? (
                        <div
                          className="text-sm leading-relaxed space-y-2"
                          dangerouslySetInnerHTML={{
                            __html: formatStructuredMessage(msg.content),
                          }}
                        />
                      ) : (
                        msg.content
                      )}
                    </div>

                    {msg.type === "assistant" && (
                      <button
                        onClick={() => handleTextToSpeech(msg.content)}
                        className="ml-2 inline-block text-slate-400 hover:text-blue-600"
                        title="Read aloud"
                      >
                        {isSpeaking ? (
                          <StopCircle size={14} />
                        ) : (
                          <Volume2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="text-slate-500 text-sm italic">Typing...</div>
                )}
                <div ref={messagesEndRef} />

                {/* 🎤 Voice Assistant Status Indicator */}
                <div className="text-center text-xs text-slate-500 mt-1">
                  {isListening ? (
                    <span className="animate-pulse text-blue-600">
                      🎙️ Listening...
                    </span>
                  ) : isTyping ? (
                    <span className="animate-pulse text-purple-600">
                      💭 Processing...
                    </span>
                  ) : (
                    <span>🟢 Ready</span>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-200 p-3 flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your question..."
                  rows={1}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-full p-2"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          )}

          {/* Feedback Tab */}
          {activeTab === "feedback" && (
            <div className="flex-1 p-4 flex flex-col bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Share your feedback
              </h2>
              <form
                onSubmit={handleFeedbackSubmit}
                className="flex flex-col gap-3 flex-1"
              >
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Type your feedback here..."
                  className="border border-slate-300 rounded-lg p-2 flex-1 text-sm resize-none"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
                >
                  Submit Feedback
                </button>
              </form>
              {feedbackStatus && (
                <p className="text-sm mt-2 text-center">{feedbackStatus}</p>
              )}
            </div>
          )}

          {/* Bottom Tabs */}
          <div className="border-t border-slate-200 bg-white flex justify-around py-2 text-slate-500 text-sm">
            <button
              className={`flex flex-col items-center ${
                activeTab === "chat" ? "text-blue-600" : ""
              }`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare size={18} />
              Chat
            </button>

            <button
              className={`flex flex-col items-center transition-all ${
                isListening ? "text-red-600 animate-pulse" : "text-slate-600"
              }`}
              onClick={startVoiceConversation}
              title={
                isListening ? "Stop voice assistant" : "Start voice assistant"
              }
            >
              <Mic size={18} />
              {isListening ? "Stop" : "Speak"}
            </button>

            <button
              className={`flex flex-col items-center ${
                activeTab === "feedback" ? "text-blue-600" : ""
              }`}
              onClick={() => setActiveTab("feedback")}
            >
              <FileText size={18} />
              Feedback
            </button>
          </div>
        </div>
      )}