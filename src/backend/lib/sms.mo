// lib/sms.mo — Fast2SMS HTTP outcall request builder
//
// Constructs an HttpRequest record compatible with the http-outcalls extension.
// The caller (mixin) is responsible for actually performing the outcall via the
// platform extension.  This module is intentionally stateless and pure.
//
import Types "../types/offer-portal";
import Text  "mo:core/Text";
import Nat   "mo:core/Nat";
import Runtime "mo:core/Runtime";

module {

  public type SmsConfig = Types.SmsConfig;

  /// The minimum HttpRequest shape expected by the http-outcalls extension.
  public type HttpRequest = {
    url     : Text;
    method  : Text;            // "POST"
    headers : [(Text, Text)];
    body    : Blob;
  };

  /// Build a Fast2SMS HTTP POST request for a single-recipient SMS.
  /// Returns the request record; caller submits it via the outcalls extension.
  public func buildSmsRequest(
    cfg     : SmsConfig,
    mobile  : Text,
    message : Text,
  ) : HttpRequest {
    let bodyText = "sender_id=" # cfg.senderId
      # "&message=" # message
      # "&language=english"
      # "&route=p"
      # "&numbers=" # mobile;
    {
      url     = "https://www.fast2sms.com/dev/bulkV2";
      method  = "POST";
      headers = [
        ("authorization", cfg.fast2smsApiKey),
        ("Content-Type", "application/x-www-form-urlencoded"),
      ];
      body    = bodyText.encodeUtf8();
    };
  };

  /// Convenience: build a recharge-success SMS message body.
  public func rechargeSuccessMessage(
    mobile   : Text,
    amount   : Nat,
    operator : Text,
  ) : Text {
    "Dear customer, your " # operator # " recharge of Rs." # amount.toText()
      # " for " # mobile # " is successful. Thank you for using Digital Zindagi!";
  };

  /// Convenience: build a recharge-failure SMS message body.
  public func rechargeFailureMessage(
    mobile   : Text,
    amount   : Nat,
    operator : Text,
  ) : Text {
    "Dear customer, your " # operator # " recharge of Rs." # amount.toText()
      # " for " # mobile # " has failed. Your wallet has been refunded. - Digital Zindagi";
  };

};
