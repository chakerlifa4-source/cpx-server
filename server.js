const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.get('/cpxPostback', async (req, res) => {
    try {
        const userId = req.query.uid;
        const payout = req.query.amount;

        if (!userId || !payout) {
            return res.status(400).send("Missing parameters: uid or amount");
        }

        const rewardAmount = parseFloat(payout);
        if (isNaN(rewardAmount)) {
            return res.status(400).send("Invalid amount format");
        }

        const userRef = db.collection("users").doc(userId);

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