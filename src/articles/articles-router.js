const express = require('express')
const ArticleServices = require('./articles.services')
const path = require('path')

const articleRouter = express.Router()
const jsonParser = express.json()
const xss = require('xss')

const serializeArticle = article => ({
    id: article.id,
    style: article.style,
    title: xss(article.title),
    content: xss(article.content),
    date_published: article.date_published,
    author: article.author,
  })

articleRouter
    .route('/')
    .get((req, res, next) => {
        ArticleServices.getAllArticles(
            req.app.get('db'),
        )
        .then(articles => {
            res.json(articles)
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { title, content, style, author } = req.body
        const newArticle = { title, content, style }
    
        for (const [key, value] of Object.entries(newArticle)) {
          if (value == null) {
            return res.status(400).json({
                error: { message: `Missing '${key}' in request body` }
            })
          }
        }
        newArticle.author = author
        ArticleServices.insertArticle(
          req.app.get('db'),
          newArticle
        )
          .then(article => {
            res
              .status(201)
              .location(path.posix.join(req.originalUrl + `/${article.id}`))
              .json(article)
          })
          .catch(next)
      })
articleRouter
    .route('/:article_id')
    .all((req, res, next) => {
        ArticleServices.getById(
            req.app.get('db'),
            req.params.article_id
        )
        .then(article => {
            if (!article) {
                return res.status(404).json({
                    error: { message: `Article dosn't exist` }
                })
            }
            res.article = article
            next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeArticle(res.article))
    })
    .delete((req, res, next) => {
        ArticleServices.deleteArticle(
            req.app.get('db'),
            req.params.article_id
        )
        .then(() => {
            res.status(204).end()
        })
        .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, content, style } = req.body
        const articleToUpdate = { title, content, style }

        const numberOfValues = Object.values(articleToUpdate).filter(Boolean).length
        if(numberOfValues === 0) {
            return res.status(400).json({
                error: { message: `Request body must contain either 'title', 'content', or 'style'` }
            })
        }

        ArticleServices.updateArticle(
            req.app.get('db'),
            req.params.article_id,
            articleToUpdate
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

    module.exports = articleRouter