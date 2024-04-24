# ecommerce
Simple ecommerce application written using typescript

Front-end using React is available on [https://github.com/elberthomay/e-commerce-react](https://github.com/elberthomay/e-commerce-react)

Live application available on [ecommercexyz.online](https://ecommercexyz.online)

Login to demo account with email hasakisekai94@gmail.com and password 12345678
## Libraries used:
- Backend application framework: **express.js**
- ORM: **Sequelize-typescript** (mysql)
- Authentication: **password.js**
- Input validation: **Zod**
- Testing: **Jest**, **Supertest**
- Scheduling: **Agenda**

## Features: 
1. Authentication with local strategy and google Oauth2
2. Create shop, show and search item by various query option, create update and delete item.
3. Putting item in cart, initiating and viewing order history, confirming and deleting order.
4. Transactional constraint preventing order race condition.
5. Order timeout using agenda.
6. deployed using kubernetes.
7. fully tested using jest and supertest.

## Full API specification
Explore full API specification here:
[ecommerce OpenAPI Spec](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/elberthomay/ecommerce/master/ecommerce_spec.yaml)
