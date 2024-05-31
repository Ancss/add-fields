#!/usr/bin/env node

const { Project } = require("ts-morph");

const directory = process.argv[2] || "src/**/*.ts";

const project = new Project();
project.addSourceFilesAtPaths(directory);

const decorators = ["ObjectType", "InputType", "ArgsType"];

function start() {
  const inputTypes = project
    .getSourceFiles()
    .map((sourceFile) => {
      return sourceFile.getClasses().filter((cls) => {
        return decorators.some((decorator) => cls.getDecorator(decorator));
      });
    })
    .flat();

  inputTypes.forEach((inputType) => {
    const properties = inputType.getProperties();
    properties.forEach((property) => {
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
            isBasicType(typeText)
              ? ""
              : `() => ${isArray ? `[${typeText}]` : typeText}`,
            isOptional ? "{ nullable: true }" : "",
          ]
            .filter(Boolean)
            .join(", "),
        });
      }
    });
  });
}
const isBasicType = (typeText) => {
  return ["string", "number", "boolean", "null", "undefined"].includes(
    typeText
  );
};
start();
project.saveSync();
