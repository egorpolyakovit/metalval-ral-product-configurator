# Portfolio case: RAL Product Configurator

## Problem
Industrial B2B customers often need to understand how a fabricated metal product will look in a specified RAL coating before requesting a quotation.

## Solution
A browser-based configurator was designed to let the customer:

1. choose a product category and size;
2. switch between available views;
3. search and select a RAL color;
4. see the product recolored in real time;
5. save the configured image;
6. continue to a quotation request.

## Product decisions

- No external rendering service: recoloring runs client-side with Canvas API.
- Product configuration is data-driven, so new product variants can be added without changing the UI logic.
- The visual algorithm preserves source lightness/shadows rather than applying a flat color overlay.
- The feature is responsive and designed to fit an existing B2B catalog workflow.

## Why it matters
The tool reduces ambiguity in specification discussions and gives the customer a visual artifact that can be shared internally before quotation approval.
