/*
Welcome to the schema! The schema is the heart of Keystone.

Here we define our 'lists', which will then be used both for the GraphQL
API definition, our database tables, and our Admin UI layout.

Some quick definitions to help out:
A list: A definition of a collection of fields with a name. For the starter
  we have `User`, `Post`, and `Tag` lists.
A field: The individual bits of data on your list, each with its own type.
  you can see some of the lists in what we use below.

*/

import { graphql } from "@graphql-ts/schema";
import { list } from "@keystone-6/core";

import {
  text,
  relationship,
  password,
  timestamp,
  select,
  integer,
  image,
  virtual,
  checkbox,
} from "@keystone-6/core/fields";
import { document } from "@keystone-6/fields-document";

export const lists = {
  User: list({
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: "unique",
        isFilterable: true,
      }),
      password: password({ validation: { isRequired: true } }),
      shopping: relationship({ ref: "Shopping.user", many: true }),
      privileged: checkbox(),
    },
    ui: {
      listView: {
        initialColumns: ["name", "email", "shopping", "privileged"],
      },
    },
  }),
  Shopping: list({
    fields: {
      shoppingDate: timestamp(),
      status: select({
        options: [
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "Purchased", value: "purchased" },
        ],
        defaultValue: "open",
        ui: {
          displayMode: "segmented-control",
        },
      }),
      user: relationship({
        ref: "User.shopping",
        many: true,
      }),
      item: relationship({
        ref: "Item.shopping",
        many: true,
        access: {
          update: async ({ session, context, inputData, item }) => {
            // console.log(item)
            if (item.status === "open") {
              let action = Object.keys(inputData.item)[0];
              const username = session.data.name;
              // check if add or remove
              if (action === "connect") {
                const users = await context.query.User.findMany({
                  where: {
                    shopping: { some: { id: { equals: item.id.toString() } } },
                  },
                  query: "name",
                });
                if (users.some((e) => e.name === username)) return true;
                return false;
              } else {
                const user = await context.query.User.findMany({
                  where: { name: { equals: username } },
                  query: "privileged",
                });
                if (user[0].privileged === true) return true;
                return false;
              }
            } else {
              return false;
            }
          },
        },
      }),
      totalPrice: virtual({
        field: graphql.field({
          type: graphql.Int,
          async resolve(item, args, context, info) {
            var sum = 0;
            const list = await context.query.Item.findMany({
              where: { shopping: { id: { equals: item.id.toString() } } },
              query: "price",
            });
            // console.log(list);
            list.forEach((value) => {
              sum = value.price + sum;
            });
            return sum;
          },
        }),
      }),
    },
  }),
  Item: list({
    fields: {
      name: text({ validation: { isRequired: true } }),
      image: image(),
      price: integer(),
      shopping: relationship({ ref: "Shopping.item" }),
    },
  }),
};
