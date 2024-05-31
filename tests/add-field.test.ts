import { Project } from "ts-morph";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
const isBasicType = (typeText) => {
  return ["string", "number", "boolean", "null", "undefined"].includes(
    typeText
  );
};
const generateTestProject = (code: string, fileName: string) => {
  const projectDir = join(__dirname, "test-project");
  const filePath = join(projectDir, fileName);

  if (!existsSync(projectDir)) {
    mkdirSync(projectDir);
  }

  writeFileSync(filePath, code);

  return {
    project: new Project(),
    filePath,
  };
};

const cleanupTestProject = () => {
  const projectDir = join(__dirname, "test-project");
  rmSync(projectDir, { recursive: true, force: true });
};

describe("add-field script", () => {
  afterEach(() => {
    cleanupTestProject();
  });

  it("should add @Field decorators to properties", () => {
    const code = `
      import { InputType } from '@nestjs/graphql';

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
    `;

    const { project, filePath } = generateTestProject(
      code,
      "create-user-input.ts"
    );
    project.addSourceFilesAtPaths(filePath);

    const sourceFile = project.getSourceFileOrThrow(filePath);
    const inputTypeClass = sourceFile.getClassOrThrow("CreateUserInput");

    // Simulate the script logic
    inputTypeClass.getProperties().forEach((property) => {
      if (!property.getDecorator("Field")) {
        let typeText = property.getType().getText();
        const isOptional = property.hasQuestionToken();

        // Extract type name if it's an imported type with path
        const match = typeText.match(/import\(".*"\)\.(.*)/);
        if (match) {
          typeText = match[1];
        }

        // Check if it's an array type and handle appropriately
        const isArray = typeText.endsWith("[]");
        if (isArray) {
          typeText = typeText.slice(0, -2);
        }

        property.addDecorator({
          name: "Field",
          arguments: [
            isArray
              ? isBasicType(typeText)
                ? `() => [${
                    typeText.slice(0, 1).toUpperCase() + typeText.slice(1)
                  }]`
                : `() => [${typeText}]`
              : isBasicType(typeText)
              ? ""
              : `() => ${typeText}`,
            isOptional ? "{ nullable: true }" : "",
          ].filter(Boolean),
        });
      }
    });

    // Check if @Field decorators were added correctly
    inputTypeClass.getProperties().forEach((property) => {
      expect(property.getDecorator("Field")).not.toBeNull();
    });

    // Save changes and read the updated code
    project.saveSync();
    const updatedCode = readFileSync(filePath, "utf-8");

    // Check the updated code for correctness
    expect(updatedCode).toContain("@Field()");
    expect(updatedCode).toContain("{ nullable: true }");
    expect(updatedCode).toContain(`import { InputType } from '@nestjs/graphql';

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
      }`);
  });
});
