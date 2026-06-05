import os
import time
import hmac
import hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS
import razorpay

app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) for Vercel deployment interaction
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/health', methods=['GET'])
def health_check():
    """Lightweight health check endpoint for Render.com's keep-alive monitoring."""
    return jsonify({"status": "healthy", "service": "Razorpay Flask Gateway"}), 200

@app.route('/api/razorpay/create-order', methods=['POST'])
def create_order():
    """
    Secure Razorpay order generation.
    Retrieves credentials dynamically, cast amount strictly to integer paise to ensure Zero API rejection.
    """
    try:
        data = request.get_json() or {}
        amount = data.get('amount')
        
        if amount is None:
            return jsonify({
                "success": False,
                "error": "Amount validation error: Parameter 'amount' is required"
            }), 400

        try:
            # Parse amount and strictly cast paise multiplier as an integer
            parsed_amount = float(amount)
            if parsed_amount <= 0:
                raise ValueError()
            amount_in_paise = int(parsed_amount * 100)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": f"Amount validation error: Intercepted invalid amount '{amount}'"
            }), 400

        # Dynamic Key Lookup: prioritize system environment variables, fallback safely to default test keys
        razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID', 'rzp_live_SxWUwa55Svm5Vt')
        razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET', 'ClmQ5hGuQe2v5CDa75lgADqm')

        # Initialize Razorpay Client dynamically per-request to avoid serverless context/authentication decay
        client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

        options = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"receipt_order_{int(time.time() * 1000)}"
        }

        # Commmunicate with Razorpay secure server
        order = client.order.create(data=options)
        
        return jsonify({
            "success": True,
            "orderId": order.get('id'),
            "keyId": razorpay_key_id
        }), 200

    except Exception as e:
        error_msg = str(e)
        error_detail = "Failed to communicate with Razorpay secure server."
        
        # Discern error scenarios (authentication vs invalid API payload parameters)
        if "auth" in error_msg.lower() or "key" in error_msg.lower() or "credential" in error_msg.lower() or "unauthorized" in error_msg.lower():
            error_detail = "Authentication failure: Please verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET credentials in your Render Environment settings are valid."
        elif "amount" in error_msg.lower() or "bad request" in error_msg.lower() or "invalid" in error_msg.lower():
            error_detail = "Amount validation error or invalid parameters passed to the Razorpay API."

        return jsonify({
            "success": False,
            "error": error_detail,
            "originalError": error_msg
        }), 500

@app.route('/api/razorpay/verify-payment', methods=['POST'])
def verify_payment():
    """
    Verifies the cryptographic payment signature returned by the Razorpay Checkout Modal.
    """
    try:
        data = request.get_json() or {}
        order_id = data.get('razorpay_order_id')
        payment_id = data.get('razorpay_payment_id')
        signature = data.get('razorpay_signature')

        if not order_id or not payment_id or not signature:
            return jsonify({
                "success": False,
                "error": "Missing verification parameters"
            }), 400

        razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET', 'ClmQ5hGuQe2v5CDa75lgADqm')

        # Verify signature according to Razorpay algorithm guidelines
        msg = f"{order_id}|{payment_id}".encode('utf-8')
        secret = razorpay_key_secret.encode('utf-8')
        generated_signature = hmac.new(secret, msg, hashlib.sha256).hexdigest()

        if hmac.compare_digest(generated_signature, signature):
            return jsonify({
                "success": True, 
                "message": "Payment verified securely"
            }), 200
        else:
            return jsonify({
                "success": False, 
                "error": "Invalid signature verification"
            }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Verification execution failed on secure server.",
            "originalError": str(e)
        }), 500

if __name__ == '__main__':
    # Get port from environment or default to 5000 for standard Python deployments
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
