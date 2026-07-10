export const SAMPLE_CURL_ENDPOINT = "https://example.com/api/v1/payment";

export const SAMPLE_CURL_REQUEST = `{
  "REQUEST_REFERENCE_NUMBER": "SBIST26149153752407000001",
  "REQUEST": {
    "customerId": "123456",
    "amount": 1000,
    "currency": "INR",
    "transactionType": "PAYMENT"
  }
}`;
