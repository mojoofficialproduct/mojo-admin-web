export const PRODUCTS_QUERY = /* GraphQL */ `
  query GetProducts($first: Int, $after: String, $last: Int, $before: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, last: $last, before: $before, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          handle
          status
          onlineStoreUrl
          vendor
          productType
          templateSuffix
          category {
            id
            name
            fullName
          }
          updatedAt
          totalInventory
          featuredImage {
            url
            altText
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 10) {
            nodes {
              id
              title
              price
              compareAtPrice
              sku
              inventoryQuantity
              inventoryItem {
                id
                tracked
              }
            }
          }
          customGroupIdMetafield: metafield(namespace: "custom", key: "mojo_group_id") {
            value
          }
          customCardGroupMetafield: metafield(namespace: "custom", key: "mojo_card_group") {
            value
          }
          customModelTitleMetafield: metafield(namespace: "custom", key: "mojo_model_title") {
            value
          }
          customColorNameMetafield: metafield(namespace: "custom", key: "mojo_color_name") {
            value
          }
          customSwatchColorMetafield: metafield(namespace: "custom", key: "mojo_swatch_color") {
            value
          }
          customColorProductsMetafield: metafield(namespace: "custom", key: "mojo_color_products") {
            value
          }
          customPrimaryProductMetafield: metafield(namespace: "custom", key: "mojo_primary_product") {
            value
          }
          customProductFeaturesMetafield: metafield(namespace: "custom", key: "mojo_product_features") {
            value
          }
        }
      }
    }
  }
`;

export const GET_PRODUCT_QUERY = /* GraphQL */ `
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      status
      onlineStoreUrl
      templateSuffix
      category {
        id
        name
        fullName
      }
      collections(first: 20) {
        nodes {
          id
          title
          handle
        }
      }
      updatedAt
      totalInventory
      featuredImage {
        url
        altText
      }
      media(first: 25) {
        nodes {
          id
          alt
          mediaContentType
          status
          ... on MediaImage {
            image {
              url
              altText
              width
              height
            }
          }
        }
      }
      variants(first: 50) {
        nodes {
          id
          title
          price
          compareAtPrice
          sku
          barcode
          inventoryQuantity
          selectedOptions {
            name
            value
          }
          inventoryItem {
            id
            tracked
            requiresShipping
            inventoryLevels(first: 5) {
              nodes {
                location {
                  id
                  name
                }
                quantities(names: ["available"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
      customGroupIdMetafield: metafield(namespace: "custom", key: "mojo_group_id") {
        id
        value
      }
      customCardGroupMetafield: metafield(namespace: "custom", key: "mojo_card_group") {
        id
        value
      }
      customModelTitleMetafield: metafield(namespace: "custom", key: "mojo_model_title") {
        id
        value
      }
      customColorNameMetafield: metafield(namespace: "custom", key: "mojo_color_name") {
        id
        value
      }
      customSwatchColorMetafield: metafield(namespace: "custom", key: "mojo_swatch_color") {
        id
        value
      }
      customColorProductsMetafield: metafield(namespace: "custom", key: "mojo_color_products") {
        id
        value
        references(first: 25) {
          nodes {
            ... on Product {
              id
              title
              handle
              status
              templateSuffix
              totalInventory
              featuredImage {
                url
                altText
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 1) {
                nodes {
                  id
                  price
                  sku
                }
              }
              customColorNameMetafield: metafield(namespace: "custom", key: "mojo_color_name") {
                value
              }
              customSwatchColorMetafield: metafield(namespace: "custom", key: "mojo_swatch_color") {
                value
              }
              customCardGroupMetafield: metafield(namespace: "custom", key: "mojo_card_group") {
                value
              }
            }
          }
        }
      }
      customPrimaryProductMetafield: metafield(namespace: "custom", key: "mojo_primary_product") {
        id
        value
      }
      customSortIndexMetafield: metafield(namespace: "custom", key: "mojo_sort_index") {
        id
        value
      }
      customProductFeaturesMetafield: metafield(namespace: "custom", key: "mojo_product_features") {
        id
        value
      }
    }
  }
`;

export const LOCATIONS_QUERY = /* GraphQL */ `
  query GetLocations {
    locations(first: 25, includeInactive: false) {
      nodes {
        id
        name
        isActive
        isPrimary
      }
    }
  }
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query GetCollections($first: Int) {
    collections(first: $first) {
      nodes {
        id
        title
        handle
        productsCount {
          count
        }
      }
    }
  }
`;

export const COLLECTION_ADD_PRODUCTS_MUTATION = /* GraphQL */ `
  mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ONLINE_STORE_PUBLICATIONS_QUERY = /* GraphQL */ `
  query GetOnlineStorePublications($first: Int!) {
    publications(first: $first) {
      nodes {
        id
        name
        autoPublish
        supportsFuturePublishing
      }
    }
  }
`;

export const PUBLISHABLE_PUBLISH_MUTATION = /* GraphQL */ `
  mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
          count
        }
        resourcePublicationsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_CREATE_MUTATION = /* GraphQL */ `
  mutation ProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        title
        handle
        status
        templateSuffix
        category {
          id
          name
          fullName
        }
        variants(first: 5) {
          nodes {
            id
            title
            price
            compareAtPrice
            sku
            barcode
            inventoryItem {
              id
              tracked
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductUpdate($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        title
        handle
        status
        templateSuffix
        updatedAt
        category {
          id
          name
          fullName
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_DELETE_MUTATION = /* GraphQL */ `
  mutation ProductDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = /* GraphQL */ `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        price
        compareAtPrice
        sku
        barcode
        inventoryItem {
          id
          tracked
          requiresShipping
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const INVENTORY_SET_QUANTITIES_MUTATION = /* GraphQL */ `
  mutation InventorySetQuantities($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
    inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      inventoryAdjustmentGroup {
        id
        reason
        changes {
          name
          delta
          quantityAfterChange
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const STAGED_UPLOADS_CREATE_MUTATION = /* GraphQL */ `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const SHOPIFY_COLOR_PATTERNS_QUERY = /* GraphQL */ `
  query GetShopifyColorPatterns($first: Int!) {
    metaobjects(type: "shopify--color-pattern", first: $first) {
      nodes {
        id
        handle
        displayName
      }
    }
  }
`;
