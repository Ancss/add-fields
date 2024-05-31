# add-field

A tool to automatically add `@Field` decorators to TypeScript classes with `@ObjectType`, `@InputType`, and `@ArgsType` decorators.

## Installation

You can use this tool directly with `npx`:

## Example

Given the following class:

```typescript
@InputType()
class CreateUserInput {
  id: number;
  name: string;
  email: string;
  password: string;
  account: Account;
  orders?: Order[];
  scores: number[];
  isAdmin: boolean;
}
```

After running the tool:

```bash
npx add-field src/**/*.ts
```

The class will be transformed into:

```typescript
@InputType()
class CreateUserInput {
  @Field()
  id: number;
  @Field()
  name: string;
  @Field()
  email: string;
  @Field()
  password: string;
  @Field(() => Account)
  account: Account;
  @Field(() => [Order], { nullable: true })
  orders?: Order[];
  @Field(() => [Number])
  scores: number[];
  @Field()
  isAdmin: boolean;
}
```
