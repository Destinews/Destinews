from flask import Flask, render_template, request, redirect, flash
from flask_mail import Mail, Message

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Optional Email Config (for sending contact form to email)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'nethravathi3172001@gmail.com'
app.config['MAIL_PASSWORD'] = 'your_app_password'

mail = Mail(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/contact', methods=['POST'])
def contact():
    name = request.form['name']
    email = request.form['email']
    message = request.form['message']

    # Email sending (optional)
    msg = Message(f"New Contact from {name}",
                  sender=email,
                  recipients=['nethravathi3172001@gmail.com'])
    msg.body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    mail.send(msg)

    flash('Message sent successfully!')
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True)
