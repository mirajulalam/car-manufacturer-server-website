const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.epu3g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" })
        }
        req.decoded = decoded;
        next()
    })
}

function sendPaymentConfirmationEmail(order) {
    const { email, name, description, price } = order;

    var order = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `Your order for ${name} is confirmed`,
        text: `Your order for ${name} is confirmed`,
        html: `
        <div>
        <p>Hello ${name},</p>
        <h3>Your order ${name} is confirmed</h3>
        <p>Loking forward to seeying you you on ${price}</p>
        <h3>Our address</h3>
        <p>andor killa bandorban</p>
        <p>bangledesh</p>
        <a href="https://web.programming-hero.com/">unsubcribe</a>
        </div>`
    };

    emailClient.sendMail(email, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });
}

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('car_parts').collection('product');
        const ordersCollection = client.db('car_parts').collection('order');
        const userCollection = client.db('car_parts').collection('users');
        const reviewsCollection = client.db('car_parts').collection('review');
        const userDetailsCollection = client.db('car_parts').collection('userdetail');
        const paymentCollection = client.db('car_parts').collection('payments');


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

        // admin add product 
        app.post("/product", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result)
        });

        // handle admin product delete
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        });

        // products order successful
        app.post("/order", async (req, res) => {
            const product = req.body;
            const result = await ordersCollection.insertOne(product)
            res.send(result)
        });

        // specific email id user purchase data show
        app.get('/order/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const orders = await ordersCollection.find(query).toArray();
            return res.send(orders)
        });


        // get specific order
        app.get("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const orders = await ordersCollection.findOne(query)
            res.send(orders)
        });

        // my order product delete
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        });

        // post review in mongodb
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


        // get user
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        // admin add
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updateDoc = {
                $set: { role: "admin" },
            };
            const result = await userCollection.updateOne(filter, updateDoc);

            res.send(result)
        })

        // admin email
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // payment system 
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        // order payment
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment)
            const updatedBooking = await ordersCollection.updateOne(filter, updateDoc)
            res.send(updateDoc)
        })

        // handle jwt token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
            res.send({ result, token })
        })


        // user profile update 
        app.put('/userdetail/:email', async (req, res) => {
            const email = req.params.email;
            const updateUser = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    name: updateUser.name,
                    email: updateUser.email,
                    education: updateUser.education,
                    location: updateUser.location,
                    link: updateUser.link
                }
            };
            const result = await userDetailsCollection.updateOne(filter, updateDoc, options);
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