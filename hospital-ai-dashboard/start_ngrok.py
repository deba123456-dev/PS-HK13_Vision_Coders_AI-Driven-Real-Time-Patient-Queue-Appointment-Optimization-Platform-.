from pyngrok import ngrok

def start_ngrok():
    try:
        # Open a HTTP tunnel on the default port 5000
        public_url = ngrok.connect(5000)
        print("==========================================")
        print(f"|  Public URL: {public_url}  |")
        print("==========================================")
        
        # Keep the process alive
        ngrok_process = ngrok.get_ngrok_process()
        try:
            # Block until CTRL-C or some other terminating event
            ngrok_process.proc.wait()
        except KeyboardInterrupt:
            print("Shutting down server.")
            ngrok.kill()
            
    except Exception as e:
        print(f"Error starting ngrok: {e}")

if __name__ == '__main__':
    start_ngrok()
