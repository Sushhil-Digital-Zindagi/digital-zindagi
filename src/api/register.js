import { db } from '../lib/firebaseAdmin';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, offerId, userData } = req.body;

  try {
    const registrationSuccess = await registerOfferUser(userId, offerId, userData);

    if (registrationSuccess) {
      return res.status(200).json({ success: true, message: "User registered successfully in Firebase" });
    } else {
      throw new Error("Registration failed");
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function registerOfferUser(userId, offerId, userData) {
  try {
    const userRef = db.collection('offer_registrations').doc(userId);
    await userRef.set({
      userId: userId,
      offerId: offerId,
      email: userData.email || "N/A",
      timestamp: new Date().toISOString(),
      status: "active",
    }, { merge: true });
    return true;
  } catch (e) {
    console.error("Firebase Store Error:", e);
    return false;
  }
}
