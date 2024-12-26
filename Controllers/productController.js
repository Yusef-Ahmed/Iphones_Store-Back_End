const { Product } = require("../Models/product");
const { Op } = require("sequelize");
const { Review } = require("../Models/review");
const { serverError } = require("./errors");

const requests = {
  get: async (req, res) => {
    try {
      const filters = req.query;
      filters.pageNumber = filters.pageNumber > 0 ? filters.pageNumber : 1;
      filters.numOfElements = parseInt(
        filters.numOfElements > 0 ? filters.numOfElements : 5
      );
      const start = (filters.pageNumber - 1) * filters.numOfElements;

      const conditions = {
        ProductTitle: {
          [Op.like]: `%${filters.name || ""}%`,
        },
        ProductBrand: {
          [Op.like]: `%${filters.brand || ""}%`,
        },
        ProductPrice: {
          [Op.gte]: filters.minPrice || 0,
          [Op.lte]: filters.maxPrice || Number.MAX_SAFE_INTEGER,
        },
        ProductRatings: {
          [Op.gte]: filters.minRating || 0,
          [Op.lte]: filters.maxRating || 5,
        },
        Marketplace: {
          [Op.like]: `%${filters.marketplace || ""}%`,
        },
      };

      const result = await Product.findAndCountAll({
        where: conditions,
        offset: start,
        limit: filters.numOfElements,
      });
      const response = {
        data: result.rows.map((product) => ({
          id: product.ProductID,
          name: product.ProductTitle,
          price: product.ProductPrice,
          rating: product.ProductRatings,
          image: product.ProductImage,
          marketplace: product.marketplace,
          description: product.ProductDescription,
        })),
        rowCount: result.count,
      };
      return res.status(200).json(response);
    } catch (error) {
      return serverError(res, error);
    }
  },
  getById: async (req, res) => {
    const productId = req.query.id.toString();
    try {
      let product = await Product.findOne({
        where: { ProductID: productId },
        raw: true,
      });
      if (!product)
        return res.status(404).json({ message: "Product not found" });
      const reviews = await Review.findAll({
        attributes: { exclude: ["reviewedID", "id"] },
        where: { reviewedID: productId },
        raw: true,
      });
      const sellerReviews = await Review.findAll({
        attributes: { exclude: ["reviewedID", "id", "category"] },
        where: { reviewedID: product.SellerName },
        raw: true,
      });
      product.reviews = reviews;
      product.sellerReviews = sellerReviews;
      product.ProductSpecifications = JSON.parse(product.ProductSpecifications);
      return res.json(product);
    } catch (error) {
      return serverError(res, error);
    }
  },
};

module.exports = { ...requests };
