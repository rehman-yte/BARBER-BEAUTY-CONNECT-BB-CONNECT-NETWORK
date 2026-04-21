
# logic_engine.py
# Backend logic for Partner Dashboard & Payment Logic

import csv
import datetime
import json

def fetch_partner_data(partner_id, master_data_path='master_data.csv'):
    """
    1. Data Integration:
    Fetch 'UPI ID' and 'Partner Type' from master_data.csv
    """
    with open(master_data_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row['id'] == partner_id:
                return {
                    'brand_name': row['brand_name'],
                    'partner_type': row['category'],
                    'upi_id': row['upi_id'],
                    'services': json.loads(row['services'])
                }
    return None

def calculate_daily_earnings(bookings):
    """
    2. 12-Hour Payment Logic:
    Aggregates all 'Confirmed' bookings.
    """
    confirmed_bookings = [b for b in bookings if b['status'] == 'Confirmed']
    return sum(b['price'] for b in confirmed_bookings)

def process_settlements(bookings, cycle_hours=12):
    """
    Implement 12-hour settlement cycles.
    Status tracking: 'PENDING (ESCROW)' -> 'READY FOR PAYOUT'
    """
    now = datetime.datetime.now()
    settlements = []
    
    # Logic to group bookings into 12-hour windows
    # ... (Implementation details)
    
    return settlements

def get_ai_insights(bookings):
    """
    4. AI Insights (The Brain):
    - Earnings per Worker
    - Estimated Wait Time
    """
    insights = {
        'earnings_per_worker': {},
        'estimated_wait_time': 0
    }
    
    # Calculate Earnings per Worker
    for b in bookings:
        worker = b.get('worker_name', 'Staff')
        if worker not in insights['earnings_per_worker']:
            insights['earnings_per_worker'][worker] = 0
        if b['status'] == 'Confirmed':
            insights['earnings_per_worker'][worker] += b['price']
            
    # Calculate Wait Time (Total Bookings * 30 mins)
    insights['estimated_wait_time'] = len(bookings) * 30
    
    return insights

def fetch_partner_services(partner_id, master_data_path='master_data.csv'):
    """
    When a partner logs in, the backend must fetch their existing services from 'master_data.csv'
    """
    try:
        with open(master_data_path, mode='r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row['id'] == partner_id:
                    return json.loads(row['services'])
    except FileNotFoundError:
        return []
    return []

def save_partner_services(partner_id, services, master_data_path='master_data.csv'):
    """
    Ensure the 'SAVE PERMANENTLY' button writes the updated service list to the partner's record.
    """
    updated_rows = []
    with open(master_data_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row['id'] == partner_id:
                row['services'] = json.dumps(services)
            updated_rows.append(row)
            
    with open(master_data_path, mode='w', newline='') as file:
        fieldnames = updated_rows[0].keys()
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)
    return True

def check_rbac(user_role, requested_url, is_active=True):
    """
    Backend Route Guard (Blueprint):
    Ensures total isolation of Partner and Customer environments.
    Includes Shop Operation Status check.
    """
    if user_role == 'partner':
        # Partners are locked out of customer areas and landing page
        if requested_url in ['/', '/dashboard', '/explore', '/auth']:
            return {'redirect': '/partner_dashboard'}
            
    elif user_role == 'customer':
        # Customers are locked out of partner areas
        if requested_url in ['/partner_dashboard', '/partner-auth', '/partner-signin']:
            return {'redirect': '/dashboard'}
            
    # Visibility check for customers
    if not is_active and requested_url == '/explore':
        # Logic to filter out this specific shop from results
        pass
            
    return {'status': 'authorized'}

def handle_session_timeout():
    """
    If the session expires, redirect both roles back to the Landing Page.
    """
    return {'redirect': '/'}

def fetch_complete_profile(partner_id, master_data_path='master_data.csv'):
    """
    Unified Login Fetch:
    On every successful OTP verification/Login, the backend queries 'master_data.csv'.
    Fetches the complete profile: Services List, UPI ID, Shop Status, and all past/future Bookings.
    """
    with open(master_data_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row['id'] == partner_id:
                return {
                    'id': row['id'],
                    'brand_name': row['brand_name'],
                    'owner_name': row['owner_name'],
                    'category': row['category'],
                    'upi_id': row['upi_id'],
                    'services': json.loads(row['services']),
                    'workers': json.loads(row['workers']),
                    'isActive': row['isActive'] == 'true',
                    'mobile': row['mobile'],
                    'bookings': json.loads(row['bookings'])
                }
    return None

def write_back_data(partner_id, updates, master_data_path='master_data.csv'):
    """
    Write-Back Rule:
    Every time a partner clicks 'SAVE PERMANENTLY' or 'ACCEPT REQUEST', 
    the change is written directly to the server database immediately.
    """
    updated_rows = []
    with open(master_data_path, mode='r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row['id'] == partner_id:
                for key, value in updates.items():
                    if isinstance(value, (list, dict)):
                        row[key] = json.dumps(value)
                    elif isinstance(value, bool):
                        row[key] = 'true' if value else 'false'
                    else:
                        row[key] = str(value)
            updated_rows.append(row)
            
    with open(master_data_path, mode='w', newline='') as file:
        if updated_rows:
            fieldnames = updated_rows[0].keys()
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)
    return True

# Note: This file serves as the logic blueprint. 
# The actual implementation is integrated into the TypeScript services for the React Dashboard.
