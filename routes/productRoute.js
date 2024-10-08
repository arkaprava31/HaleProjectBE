const express = require('express');
const Products = require('../models/Product.js');
const Sections = require('../models/Section.js');
const auth = require('../utils/jwtUtils.js');
const DOCs = require('../models/DOCs.js');
const InPdts = require('../models/InPdts.js');
const OutDocs = require('../models/OutDoc.js');
const Sales = require('../models/Sales.js');
const mongoose = require('mongoose');
const StockAdjDocs = require('../models/StockAdj.js');

const router = express.Router();

// router.get('/allpdts', auth, async (req, res) => {
//     try {
//         const pdts = await Products.find();
//         res.status(200).json(pdts);
//     } catch (error) {
//         console.error('Server error:', error);
//         res.status(500).json({ message: 'Server error', error });
//     }
// });

router.get('/allpdts', auth, async (req, res) => {
    try {
        const pdts = await Products.find();

        const enrichedPdts = await Promise.all(pdts.map(async product => {
            const inPdt = await InPdts.findOne({ productID: product._id.toString() });
            return {
                ...product._doc,
                totalRecQty: inPdt ? inPdt.totQty : 0
            };
        }));

        res.status(200).json(enrichedPdts);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.post('/addSection', async (req, res) => {
    try {
        const { projectId, secname } = req.body;

        const newSection = new Sections({
            projectId, secname
        });

        await newSection.save();

        res.status(201).json({ message: "Section is added." });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
})

router.delete('/deleteSection/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const section = await Sections.findById(id);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        await Sections.deleteOne({ _id: id });

        res.status(200).json({ message: 'Section deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/getsections/:projectId', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const sectionData = await Sections.find({ projectId });
        res.status(200).json({ sectionData });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.post('/newProduct', async (req, res) => {
    try {
        const { projectId, type, title, desc, imageUrl } = req.body;

        const newProduct = new Products({
            projectId, type, title, desc, imageUrl
        });

        const product = await newProduct.save();

        res.status(201).json({ message: "Product is added.", product });
    } catch (error) {
        console.error('Error registering product:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/newProductItem', async (req, res) => {
    const {
        projectId, type, name, desc, code, unit, len, wid, dia, color, material,
        insert, finish, qty, vendor, budget, buyCost, sellCost, imageUrl
    } = req.body;

    try {
        const newProduct = new Products({
            projectId,
            type,
            title: name,
            desc,
            productDetails: {
                code, unit, len, wid, dia, color, material, insert, finish, qty, vendor,
                budget, buyCost, sellCost
            },
            imageUrl
        });

        await newProduct.save();

        const newInPdt = new InPdts({
            productID: newProduct._id,
            totQty: 0
        });

        await newInPdt.save();

        res.status(201).json({ message: 'Product registered successfully', product: newProduct });
    } catch (error) {
        res.status(400).json({ message: 'Error registering product', error: error.message });
    }
});

router.get('/allProducts/:projectId', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const allProducts = await Products.find({ projectId });
        res.status(200).json({ allProducts });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/product/:projectId/:name/newComment/:_id', async (req, res) => {
    const { projectId, name, _id } = req.params;
    const { body } = req.body;

    try {
        const product = await Products.findOne({ _id, projectId });

        if (!product) {
            console.log('Product not found'); // Log if product is not found
            return res.status(404).json({ message: 'Product not found' });
        }

        const newComment = {
            name: name,
            body
        };

        product.comments.push(newComment);

        await product.save();

        res.status(201).json({ message: 'Comment added successfully', product });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/newChat/:id', async (req, res) => {
    const { id } = req.params;
    const { name, body, userType } = req.body;

    try {
        const product = await Products.findById(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found!' });
        }

        const newChat = {
            name: name,
            body: body,
            userType: userType
        };

        product.chats.push(newChat);

        await product.save();

        res.status(201).json({ message: 'Chat is updated' });
    } catch (error) {
        console.error('Error adding chat:', error);
        res.status(500).json({ message: 'Error adding chat!' });
    }
});

router.put('/product/:_id', async (req, res) => {
    const { _id } = req.params;
    const { title, desc, imageUrl } = req.body;
    try {
        const pdt = await Products.findById(_id);

        if (!pdt) {
            return res.status(404).json({ message: 'Item not found' });
        }

        pdt.title = title || pdt.title;
        pdt.desc = desc || pdt.desc;
        pdt.imageUrl = imageUrl || pdt.imageUrl;

        await pdt.save();

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/newProductItem/:id', async (req, res) => {
    const {
        projectId, type, name, desc, code, unit, len, wid, dia, color, material,
        insert, finish, qty, vendor, budget, buyCost, sellCost, imageUrl
    } = req.body;

    try {
        const existingProduct = await Products.findById(req.params.id);

        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const updatedProduct = await Products.findByIdAndUpdate(
            req.params.id,
            {
                projectId: projectId || existingProduct.projectId,
                type: type || existingProduct.type,
                title: name || existingProduct.title,
                desc: desc || existingProduct.desc,
                productDetails: {
                    code: code || existingProduct.productDetails.code,
                    unit: unit || existingProduct.productDetails.unit,
                    len: len !== undefined ? len : existingProduct.productDetails.len,
                    wid: wid !== undefined ? wid : existingProduct.productDetails.wid,
                    dia: dia !== undefined ? dia : existingProduct.productDetails.dia,
                    color: color || existingProduct.productDetails.color,
                    material: material || existingProduct.productDetails.material,
                    insert: insert || existingProduct.productDetails.insert,
                    finish: finish || existingProduct.productDetails.finish,
                    qty: qty !== undefined ? qty : existingProduct.productDetails.qty,
                    vendor: vendor || existingProduct.productDetails.vendor,
                    budget: budget !== undefined ? budget : existingProduct.productDetails.budget,
                    buyCost: buyCost !== undefined ? buyCost : existingProduct.productDetails.buyCost,
                    sellCost: sellCost !== undefined ? sellCost : existingProduct.productDetails.sellCost
                },
                imageUrl: imageUrl || existingProduct.imageUrl
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error updating product', error: error.message });
    }
});

router.delete('/product/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pdt = await Products.findById(id);
        if (!pdt) {
            return res.status(404).json({ message: 'Item not found' });
        }

        await Products.deleteOne({ _id: id });

        if (pdt.type === 'Product') {
            const inpdts = await InPdts.findOne({ productID: id });

            if (!inpdts) {
                return res.status(404).json({ message: 'Inventory item not found' });
            }

            await InPdts.deleteOne({ productID: id });
        }

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

//For procurement
router.get('/products/:secId', auth, async (req, res) => {
    const { secId } = req.params;

    try {
        const sections = await Sections.find({ projectId: secId });

        const sectionIds = sections.map(section => section._id);

        const products = await Products.find({ projectId: { $in: sectionIds } });

        res.status(200).json({ products });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/updateQty/:id', async (req, res) => {
    const { id } = req.params;
    const { qty } = req.body;

    try {
        const pdt = await Products.findById(id);
        if (!pdt) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // pdt.productDetails.qty = qty;
        await pdt.save();
        res.status(200).json({ message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/findProducts-out/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const sections = await Sections.find({ projectId: id });

        if (!sections.length) {
            return res.status(404).json({ message: 'No sections found for this projectId' });
        }

        const sectionIds = sections.map(section => section._id);

        const products = await Products.find({ projectId: { $in: sectionIds } });

        if (!products.length) {
            return res.status(404).json({ message: 'No products found for these sections' });
        }

        const enrichedProducts = await Promise.all(products.map(async (product) => {
            const inPdt = await InPdts.findOne({ productID: product._id.toString() });
            return {
                ...product._doc,
                totQty: inPdt ? inPdt.totQty : 0
            };
        }));

        res.status(200).json(enrichedProducts);
    } catch (error) {
        console.error('Error finding products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/outDocs', auth, async (req, res) => {
    try {
        const docs = await OutDocs.find();
        res.status(200).json(docs);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/updateOutDoc', async (req, res) => {
    try {
        const {
            array,
            docNum,
            projectId,
            reason,
            products
        } = req.body;

        await Promise.all(array.map(async (item) => {
            const { pdtid, qty } = item;

            const inPdt = await InPdts.findOne({ productID: pdtid });

            if (inPdt) {
                inPdt.totQty = Number(inPdt.totQty) - Number(qty);
                await inPdt.save();
            } else {
                return res.status(404).json({ message: `Product with ID ${pdtid} not found!` });
            }
        }));

        const prj = await Sales.findById(projectId);

        const newDoc = new OutDocs({
            docNum, projectName: prj.name, reason, products
        });

        await newDoc.save();

        res.status(200).json({ message: 'Inventory updated successfully' });
    } catch (error) {
        console.error('Error updating quantities:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/updatePdtStatus/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const pdt = await Products.findById(id);

        if (!pdt) {
            return res.status(404).json({ message: 'Product not found' });
        }

        pdt.status = status || pdt.status;

        await pdt.save();

        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Error updating status:', error });
    }
});

router.get('/viewOutDoc/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid document ID" });
        }

        const doc = await OutDocs.findOne({ _id: id });

        if (!doc) {
            return res.status(404).json({ message: "Document not found!" });
        }

        const productIds = doc.products.map(product => product.pdtid);

        const productsDetails = await Products.find({ _id: { $in: productIds } });

        const response = doc.products.map(product => {
            const productDetail = productsDetails.find(pd => pd._id.toString() === product.pdtid);
            return {
                ...productDetail._doc,
                outQty: product.qty
            };
        });

        res.status(200).json(response);
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/getInvPdts', auth, async (req, res) => {
    try {
        const pdts = await InPdts.find();

        const pdtIds = pdts.map(pdt => pdt.productID);

        const products = await Products.find({ _id: { $in: pdtIds } });

        const pdtArray = pdts.map(pdt => {
            const productDetail = products.find(pd => pd._id.toString() === pdt.productID);
            return {
                ...productDetail._doc,
                totQty: pdt.totQty
            };
        });

        res.status(200).json(pdtArray);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.put('/update-invQty', async (req, res) => {
    try {
        const { docNum, reason, products } = req.body;

        for (const product of products) {
            await InPdts.findOneAndUpdate(
                { productID: product.pdtid },
                { $set: { totQty: product.qty } },
                { new: true, upsert: false }
            );
        }

        const newDoc = new StockAdjDocs({ docNum, reason, products });

        await newDoc.save();

        res.status(200).json({ message: 'Quantities updated successfully' });
    } catch (error) {
        console.error('Error updating quantities:', error);
        res.status(500).json({ error: 'Failed to update quantities' });
    }
});

router.get('/getStockAdjDocs', auth, async (req, res) => {
    try {
        const docs = await StockAdjDocs.find();
        res.status(200).json(docs);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/viewSADoc/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid document ID" });
        }

        const doc = await StockAdjDocs.findOne({ _id: id });

        if (!doc) {
            return res.status(404).json({ message: "Document not found!" });
        }

        const productIds = doc.products.map(product => product.pdtid);

        const productsDetails = await Products.find({ _id: { $in: productIds } });

        const response = doc.products.map(product => {
            const productDetail = productsDetails.find(pd => pd._id.toString() === product.pdtid);
            return {
                ...productDetail._doc,
                qty: product.qty
            };
        });

        res.status(200).json(response);
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/calculate-revenue', auth, async (req, res) => {
    try {
      const inPdts = await InPdts.find();
  
      let totalCost = 0;

      for (const inPdt of inPdts) {
        const product = await Products.findById(inPdt.productID);
  
        if (product) {
          totalCost += inPdt.totQty * product.productDetails.sellCost;
        }
      }
  
      res.status(200).json(totalCost);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;