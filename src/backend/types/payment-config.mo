module {
  /// Payment gateway configuration stored in the canister.
  /// Readable by all users (providers/riders need to display UPI/QR).
  /// Writable only by admins.
  public type PaymentConfig = {
    razorpayKeyId     : Text;
    razorpayKeySecret : Text;
    upiVpa            : Text;   // Virtual Payment Address, e.g. "shop@upi"
    qrCodeUrl         : Text;   // URL of the QR code image
  };
};
