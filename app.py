from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import re

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sunset.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'resrtaurant'  
app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    bookings = db.relationship('Booking', backref='user', lazy=True)
    food_orders = db.relationship('FoodOrder', backref='user', lazy=True)

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    image_url = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)

class SpecialService(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=False)

class Table(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.String(20), unique=True, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    time = db.Column(db.String(10), nullable=False)
    guests = db.Column(db.Integer, nullable=False)
    table_id = db.Column(db.Integer, db.ForeignKey('table.id'), nullable=True)
    items = db.Column(db.String(500), nullable=True)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=True)
    status = db.Column(db.String(20), default='Pending')
    table = db.relationship('Table', backref='bookings')

class Meal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    price = db.Column(db.Float, nullable=False)

class FoodOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=True)
    table_id = db.Column(db.Integer, db.ForeignKey('table.id'), nullable=True)
    items = db.Column(db.String(500), nullable=False)
    special_requests = db.Column(db.String(200))
    status = db.Column(db.String(20), default='Pending')
    table = db.relationship('Table', backref='food_orders')

# Create database
with app.app_context():
    db.create_all()

# Helper function for image uploads
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Context Processor
@app.context_processor
def inject_globals():
    user = None
    if 'user_email' in session:
        user = User.query.filter_by(email=session['user_email']).first()
        if not user:
            session.pop('user_email', None)
    return dict(
        meals=Meal.query.all() or [],
        tables=Table.query.all() or [],
        user=user
    )

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/services')
def services():
    services = Service.query.all()
    special_services = SpecialService.query.all()
    return render_template('services.html', services=services, special_services=special_services)

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user_email' not in session:
        return redirect(url_for('login_page'))
    user = User.query.filter_by(email=session['user_email']).first()
    if not user:
        session.pop('user_email', None)
        return redirect(url_for('login_page'))
    if request.method == 'POST':
        data = request.json
        if 'name' in data:
            user.name = data['name']
            user.email = data['email']
            if data['password']:
                user.password_hash = generate_password_hash(data['password'])
            db.session.commit()
            session['user_email'] = user.email
            return jsonify({'message': 'Profile updated'})
        elif 'booking_id' in data:
            booking = Booking.query.get_or_404(data['booking_id'])
            if booking.user_id != user.id:
                return jsonify({'message': 'Unauthorized'}), 403
            if booking.status != 'Pending':
                return jsonify({'message': 'Cannot update non-pending booking'}), 400
            booking.date = data['date']
            booking.time = data['time']
            booking.guests = data['guests']
            booking.table_id = data['table_id']
            booking.items = ', '.join(data['items']) if data['items'] else None
            db.session.commit()
            return jsonify({'message': 'Booking updated'})
    return render_template('profile.html')

@app.route('/cancel_booking/<int:id>', methods=['POST'])
def cancel_booking(id):
    if 'user_email' not in session:
        return jsonify({'message': 'Please login'}), 401
    user = User.query.filter_by(email=session['user_email']).first()
    booking = Booking.query.get_or_404(id)
    if booking.user_id != user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    if booking.status != 'Pending':
        return jsonify({'message': 'Cannot cancel non-pending booking'}), 400
    booking.status = 'Cancelled'
    db.session.commit()
    return jsonify({'message': 'Booking cancelled'})

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if len(data['name']) < 2:
        return jsonify({'message': 'Name must be at least 2 characters'}), 400
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', data['email']):
        return jsonify({'message': 'Invalid email format'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$', data['password']):
        return jsonify({'message': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'}), 400
    if data['password'] != data['confirm_password']:
        return jsonify({'message': 'Passwords do not match'}), 400
    user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registration successful! Please login.'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_email'] = user.email
        return jsonify({'message': 'Login successful!'})
    return jsonify({'message': 'Invalid email or password'}), 401

@app.route('/login_page')
def login_page():
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_email', None)
    session.pop('admin', None)
    return redirect(url_for('index'))

@app.route('/book_table', methods=['GET', 'POST'])
def book_table():
    if 'user_email' not in session:
        return jsonify({'message': 'Please login to book a table'}), 401
    user = User.query.filter_by(email=session['user_email']).first()
    if not user:
        session.pop('user_email', None)
        return jsonify({'message': 'User not found, please login again'}), 401
    if request.method == 'POST':
        data = request.json
        booking = Booking(
            user_id=user.id,
            name=data['name'],
            email=data['email'],
            date=data['date'],
            time=data['time'],
            guests=data['guests'],
            table_id=data['table_id'],
            status='Pending'
        )
        db.session.add(booking)
        db.session.commit()
        return jsonify({'message': 'Booking successful!', 'booking_id': booking.id})
    return render_template('booking_form.html')

@app.route('/book_service', methods=['GET', 'POST'])
def book_service():
    if 'user_email' not in session:
        return jsonify({'message': 'Please login to book a service'}), 401
    user = User.query.filter_by(email=session['user_email']).first()
    if not user:
        session.pop('user_email', None)
        return jsonify({'message': 'User not found, please login again'}), 401
    if request.method == 'POST':
        data = request.json
        print('Received service booking data:', data)
        required_fields = ['name', 'email', 'date', 'time', 'guests', 'service_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'Missing or empty field: {field}'}), 400
        try:
            guests = int(data['guests'])
            service_id = int(data['service_id'])
            table_id = int(data['table_id']) if data['table_id'] else None
        except ValueError:
            return jsonify({'message': 'Invalid number format for guests, service_id, or table_id'}), 400
        if not Service.query.get(service_id):
            return jsonify({'message': 'Invalid service selected'}), 400
        if table_id and not Table.query.get(table_id):
            return jsonify({'message': 'Invalid table selected'}), 400
        booking = Booking(
            user_id=user.id,
            name=data['name'],
            email=data['email'],
            date=data['date'],
            time=data['time'],
            guests=guests,
            table_id=table_id,
            items=', '.join(data['items']) if data['items'] else None,
            service_id=service_id,
            status='Pending'
        )
        db.session.add(booking)
        db.session.commit()
        return jsonify({'message': 'Booking successful!', 'booking_id': booking.id})
    return render_template('service_booking_form.html')

@app.route('/order_food', methods=['POST'])
def order_food():
    if 'user_email' not in session:
        return jsonify({'message': 'Please login to place an order'}), 401
    user = User.query.filter_by(email=session['user_email']).first()
    if not user:
        session.pop('user_email', None)
        return jsonify({'message': 'User not found, please login again'}), 401
    data = request.json
    if not data['items']:
        return jsonify({'message': 'Please select at least one meal'}), 400
    order = FoodOrder(
        user_id=user.id,
        booking_id=int(data['booking_id']) if data['booking_id'] else None,
        table_id=int(data['table_id']),
        items=', '.join(data['items']),
        special_requests=data.get('special_requests'),
        status='Pending'
    )
    db.session.add(order)
    db.session.commit()
    print(f"Order saved: ID={order.id}, Table={order.table_id}, Booking={order.booking_id}")
    return jsonify({'message': 'Food order placed!'})

@app.route('/api/bookings/active')
def active_bookings():
    if 'user_email' not in session:
        return jsonify([]), 401
    user = User.query.filter_by(email=session['user_email']).first()
    if not user:
        return jsonify([]), 401
    bookings = Booking.query.filter_by(user_id=user.id)\
        .filter(Booking.status.in_(['Pending', 'Confirmed']))\
        .order_by(Booking.id.desc())\
        .all()
    return jsonify([{
        'id': b.id,
        'table_id': b.table_id,
        'table': {'table_number': b.table.table_number},
        'date': b.date
    } for b in bookings])
    
    
# Admin Routes
@app.route('/admin')
def admin():
    if 'admin' not in session:
        return redirect(url_for('admin_login'))
    bookings = Booking.query.all()
    orders = FoodOrder.query.all()
    services = Service.query.all()
    special_services = SpecialService.query.all()
    users = User.query.all()
    return render_template('admin.html', bookings=bookings, orders=orders, services=services, special_services=special_services, users=users)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'admin123':
            session['admin'] = 'admin'
            return redirect(url_for('admin'))
        return render_template('admin_login.html', error='Invalid credentials')
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/change_password', methods=['POST'])
def change_password():
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    if not current_password or not new_password or not confirm_password:
        return jsonify({'message': 'All fields are required'}), 400
    if current_password != 'admin123':
        return jsonify({'message': 'Incorrect current password'}), 400
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$', new_password):
        return jsonify({'message': 'New password must be at least 8 characters with uppercase, lowercase, number, and special character'}), 400
    if new_password != confirm_password:
        return jsonify({'message': 'New passwords do not match'}), 400
    return jsonify({'message': 'Password changed successfully'})

@app.route('/admin/users')
def admin_users():
    if 'admin' not in session:
        return redirect(url_for('admin_login'))
    users = User.query.all()
    return jsonify([{'id': u.id, 'name': u.name, 'email': u.email} for u in users])

@app.route('/admin/update_user/<int:id>', methods=['POST'])
def update_user(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    user = User.query.get_or_404(id)
    data = request.json
    if not data['name'] or not data['email']:
        return jsonify({'message': 'Name and email are required'}), 400
    if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already in use'}), 400
    user.name = data['name']
    user.email = data['email']
    if data.get('password'):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$', data['password']):
            return jsonify({'message': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'}), 400
        user.password_hash = generate_password_hash(data['password'])
    db.session.commit()
    return jsonify({'message': 'User updated'})

@app.route('/admin/delete_user/<int:id>', methods=['POST'])
def delete_user(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@app.route('/admin/add_service', methods=['POST'])
def add_service():
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    title = request.form.get('title')
    description = request.form.get('description')
    price = request.form.get('price')
    image = request.files.get('image')
    if not title or not description or not price or not image:
        print(f"Missing fields: title={title}, description={description}, price={price}, image={image}")
        return jsonify({'message': 'All fields are required'}), 400
    try:
        price = float(price)
    except ValueError:
        print(f"Invalid price: {price}")
        return jsonify({'message': 'Invalid price format'}), 400
    if not allowed_file(image.filename):
        print(f"Invalid image format: {image.filename}")
        return jsonify({'message': 'Invalid image format. Use PNG, JPG, JPEG, or GIF'}), 400
    filename = secure_filename(image.filename)
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        image.save(image_path)
        print(f"Image saved to: {image_path}")
    except Exception as e:
        print(f"Error saving image: {e}")
        return jsonify({'message': 'Error saving image'}), 500
    service = Service(
        title=title,
        description=description,
        image_url=f'/uploads/{filename}',
        price=price
    )
    try:
        db.session.add(service)
        db.session.commit()
        print(f"Service added: {title}, image_url=/Uploads/{filename}")
    except Exception as e:
        db.session.rollback()
        print(f"Error committing service: {e}")
        return jsonify({'message': 'Error saving service'}), 500
    return jsonify({'message': 'Service added'})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        print(f"File not found: {filename}")
        return jsonify({'message': 'Image not found'}), 404

@app.route('/admin/update_service/<int:id>', methods=['POST'])
def update_service(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    service = Service.query.get_or_404(id)
    title = request.form.get('title')
    description = request.form.get('description')
    price = request.form.get('price')
    image = request.files.get('image')
    if not title or not description or not price:
        print(f"Missing fields: title={title}, description={description}, price={price}")
        return jsonify({'message': 'Title, description, and price are required'}), 400
    try:
        price = float(price)
    except ValueError:
        print(f"Invalid price: {price}")
        return jsonify({'message': 'Invalid price format'}), 400
    service.title = title
    service.description = description
    service.price = price
    if image and allowed_file(image.filename):
        filename = secure_filename(image.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            image.save(image_path)
            print(f"Image updated to: {image_path}")
            service.image_url = f'/Uploads/{filename}'
        except Exception as e:
            print(f"Error saving image: {e}")
            return jsonify({'message': 'Error saving image'}), 500
    try:
        db.session.commit()
        print(f"Service updated: {title}, image_url={service.image_url}")
    except Exception as e:
        db.session.rollback()
        print(f"Error updating service: {e}")
        return jsonify({'message': 'Error updating service'}), 500
    return jsonify({'message': 'Service updated'})

@app.route('/admin/delete_service/<int:id>', methods=['POST'])
def delete_service(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    service = Service.query.get_or_404(id)
    try:
        db.session.delete(service)
        db.session.commit()
        print(f"Service deleted: ID={id}")
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting service: {e}")
        return jsonify({'message': 'Error deleting service'}), 500
    return jsonify({'message': 'Service deleted'})

@app.route('/admin/add_special_service', methods=['POST'])
def add_special_service():
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    special_service = SpecialService(
        title=data['title'],
        description=data['description']
    )
    db.session.add(special_service)
    db.session.commit()
    return jsonify({'message': 'Special service added'})

@app.route('/admin/add_meal', methods=['POST'])
def add_meal():
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    meal = Meal(
        name=data['name'],
        description=data['description'],
        price=data['price']
    )
    db.session.add(meal)
    db.session.commit()
    return jsonify({'message': 'Meal added'})

@app.route('/admin/delete_meal/<int:id>', methods=['POST'])
def delete_meal(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    meal = Meal.query.get_or_404(id)
    db.session.delete(meal)
    db.session.commit()
    return jsonify({'message': 'Meal deleted'})

@app.route('/admin/add_table', methods=['POST'])
def add_table():
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    if Table.query.filter_by(table_number=data['table_number']).first():
        return jsonify({'message': 'Table number already exists'}), 400
    table = Table(
        table_number=data['table_number'],
        capacity=data['capacity']
    )
    db.session.add(table)
    db.session.commit()
    return jsonify({'message': 'Table added'})

@app.route('/admin/delete_table/<int:id>', methods=['POST'])
def delete_table(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    table = Table.query.get_or_404(id)
    db.session.delete(table)
    db.session.commit()
    return jsonify({'message': 'Table deleted'})

@app.route('/admin/update_booking/<int:id>', methods=['POST'])
def update_booking(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    booking = Booking.query.get_or_404(id)
    booking.status = request.json['status']
    db.session.commit()
    return jsonify({'message': 'Booking updated'})

@app.route('/admin/update_order/<int:id>', methods=['POST'])
def update_order(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    order = FoodOrder.query.get_or_404(id)
    order.status = request.json['status']
    db.session.commit()
    return jsonify({'message': 'Order updated'})

@app.route('/admin/delete_order/<int:id>', methods=['POST'])
def delete_order(id):
    if 'admin' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    order = FoodOrder.query.get_or_404(id)
    db.session.delete(order)
    db.session.commit()
    return jsonify({'message': 'Order deleted'})

if __name__ == '__main__':
    app.run(debug=True)