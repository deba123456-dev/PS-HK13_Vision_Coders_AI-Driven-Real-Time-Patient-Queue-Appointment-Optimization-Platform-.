import os
import sys

# Add backend dir to path so sibling modules resolve
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask

def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates'),
        static_folder=os.path.join(os.path.dirname(__file__), '..', 'static')
    )
    app.secret_key = 'mediflow-ai-hospital-secret-key-2024'

    from auth import auth_bp
    from routes import main_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    print("==========================================")
    print("|      MediFlow AI Dashboard               |")
    print("|   http://localhost:5000                  |")
    print("|                                          |")
    print("|   Admin:   admin@mediflow.com / admin123 |")
    print("|   Doctor:  malhotra@mediflow.com         |")
    print("|             / doctor123                  |")
    print("|   Patient: arjun@patient.com / patient123|")
    print("==========================================")
    app.run(debug=True, host='0.0.0.0', port=5000)
