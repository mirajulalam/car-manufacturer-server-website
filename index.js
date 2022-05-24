const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.epu3g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('car_parts').collection('product');
        const ordersCollection = client.db('car_parts').collection('order');
        // const userCollection = client.db('car_parts').collection('users');
        const reviewsCollection = client.db('car_parts').collection('review');

        // app.put('/user/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const user = req.body;
        //     const filter = { email: email }
        //     const options = { upsert: true }
        //     const updateDoc = {
        //         $set: user,
        //     };
        //     const result = await userCollection.updateOne(filter, updateDoc, options)
        //     res.send(result)
        // })

        // handle get all product load
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        });

        // specific id product details
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const products = await productsCollection.findOne(query)
            res.send(products)
        });

        // specific email id user purchase data show
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders)
        });

        // products order successful
        app.post("/order", async (req, res) => {
            const product = req.body;
            const result = await ordersCollection.insertOne(product)
            res.send(result)
        });

        // my order product delete
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        });


        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        });
        // get all review
        app.get("/review", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', async (req, res) => {
    res.send('Car parts manufacturer')
})


app.listen(port, () => {
    console.log(`Car parts listen on port ${port}`);
})