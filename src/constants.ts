export interface Language {
  id: string;
  name: string;
  monaco: string;
  jdoodle: string;
  versionIndex: string;
  template: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    id: 'nodejs',
    name: 'Node.js',
    monaco: 'javascript',
    jdoodle: 'nodejs',
    versionIndex: '4',
    template: `// Node.js doesn't have prompt(). Use readline for terminal input:
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question("What is your name? ", name => {
  console.log(\`Hello, ${name}!\`);
  readline.close();
});`
  },
  {
    id: 'python3',
    name: 'Python 3',
    monaco: 'python',
    jdoodle: 'python3',
    versionIndex: '4',
    template: '# Hello from Python\nprint("Hello, World!")'
  },
  {
    id: 'java',
    name: 'Java',
    monaco: 'java',
    jdoodle: 'java',
    versionIndex: '4',
    template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
  },
  {
    id: 'cpp',
    name: 'C++',
    monaco: 'cpp',
    jdoodle: 'cpp17',
    versionIndex: '1',
    template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  },
  {
    id: 'c',
    name: 'C',
    monaco: 'c',
    jdoodle: 'c',
    versionIndex: '4',
    template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
  },
  {
    id: 'go',
    name: 'Go',
    monaco: 'go',
    jdoodle: 'go',
    versionIndex: '4',
    template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}'
  },
  {
    id: 'rust',
    name: 'Rust',
    monaco: 'rust',
    jdoodle: 'rust',
    versionIndex: '4',
    template: 'fn main() {\n    println!("Hello, World!");\n}'
  },
  {
    id: 'php',
    name: 'PHP',
    monaco: 'php',
    jdoodle: 'php',
    versionIndex: '4',
    template: '<?php\necho "Hello, World!";'
  },
  {
    id: 'ruby',
    name: 'Ruby',
    monaco: 'ruby',
    jdoodle: 'ruby',
    versionIndex: '4',
    template: 'puts "Hello, World!"'
  },
  {
    id: 'swift',
    name: 'Swift',
    monaco: 'swift',
    jdoodle: 'swift',
    versionIndex: '4',
    template: 'print("Hello, World!")'
  }
];
