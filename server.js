const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// استدعاء ملف مفتاح الأمان السري
const serviceAccount = require('./serviceAccountKey.json');

// تهيئة فايربيس بالطريقة المعيارية الحديثة
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();
app.use(express.json());

app.get('/cpxPostback', async (req, res) => {
    try {
        const userId = req.query.uid;       // معرف المستخدم المرسل من تطبيقك
        const payout = req.query.amount;    // قيمة الأرباح

        if (!userId || !payout) {
            return res.status(400).send("Missing parameters: uid or amount");
        }

        const rewardAmount = parseFloat(payout);
        if (isNaN(rewardAmount)) {
            return res.status(400).send("Invalid amount format");
        }

        const userRef = db.collection("users").doc(userId);

        // تحديث الرصيد سحابياً بشكل آمن عبر Transaction
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User does not exist in database");
            }

            const currentBalance = userDoc.data().balance || 0.0;
            const newBalance = currentBalance + rewardAmount;

            transaction.update(userRef, { balance: newBalance });
        });

        console.log(`Successfully rewarded user ${userId} with $${rewardAmount}`);
        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error processing CPX postback:", error);
        return res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});