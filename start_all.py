import subprocess
import sys
import time
import os

def run_flask():
    print("Starting Flask Web Server...")
    return subprocess.Popen([sys.executable, "main.py"])

def run_telegram_bot():
    print("Starting Telegram Bot...")
    return subprocess.Popen([sys.executable, "telegram_bot.py"])

if __name__ == "__main__":
    # Ensure database is initialized
    if not os.path.exists("instance/alhabib_chatbot.db"):
        print("Initializing database...")
        subprocess.run([sys.executable, "init_and_train.py"])

    flask_process = run_flask()
    time.sleep(2)  # Give Flask a moment to start
    bot_process = run_telegram_bot()

    try:
        while True:
            # Check if processes are still running
            if flask_process.poll() is not None:
                print("Flask process exited. Restarting...")
                flask_process = run_flask()
            
            if bot_process.poll() is not None:
                print("Telegram bot process exited. Restarting...")
                bot_process = run_telegram_bot()
                
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nStopping services...")
        flask_process.terminate()
        bot_process.terminate()
        print("Done.")
