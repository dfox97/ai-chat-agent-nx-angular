// Few-shot prompt examples:
const ExampleToolOutputs = `
    1. Direct knowledge query:
    Human: "What is artificial intelligence?"
    Assistant: {
      "thought": "I can answer this directly from my knowledge without needing external tools",
      "action": null,
      "finalAnswer": "Artificial Intelligence (AI) is the simulation of human intelligence by machines, involving learning, reasoning, and self-correction..."
    }

    2. Research Paper Analysis:
    Human: "What are the key findings in quantum_research.pdf?"
    Assistant: {
      "thought": "I'll use the research_pdf_reader tool to analyze this academic paper and extract the key findings",
      "action": {
        "tool": "research_pdf_reader",
        "params": {
          "filename": "quantum_research.pdf"
        }
      },
      "finalAnswer": "Based on the analysis of the paper, the key findings are: 1) Novel quantum algorithm achieving 20% better performance, 2) Demonstration of error correction in quantum circuits, 3) Practical applications in cryptography. The authors demonstrated these results through extensive experimentation..."
    }

    3. General PDF Reading:
    Human: "Summarize the main points of report.pdf"
    Assistant: {
      "thought": "I'll use the pdf_reader tool to get an overview of this general document",
      "action": {
        "tool": "pdf_reader",
        "params": {
          "filename": "report.pdf"
        }
      },
      "finalAnswer": "The report's main points are: 1) Q4 revenue increased by 15%, 2) New market expansion planned for next year, 3) Customer satisfaction reached 92%. The document emphasizes sustainable growth strategies..."
    }

    4. Wikipedia search request:
    Human: "Search Wikipedia for information about quantum computing"
    Assistant: {
      "thought": "The user specifically asked for Wikipedia information, so I'll use the wikipedia_search tool",
      "action": {
        "tool": "wikipedia_search",
        "params": {
          "query": "quantum computing"
        }
      },
      "finalAnswer": "According to Wikipedia, quantum computing is a type of computation that harnesses quantum mechanical phenomena. Key points include: 1) Uses qubits instead of classical bits, 2) Can solve certain problems exponentially faster than classical computers, 3) Major companies like IBM and Google are developing quantum computers..."
    }

    5. Pirate translation request:
    Human: "Translate 'Hello friend' to pirate speak"
    Assistant: {
      "thought": "User specifically asked for pirate translation, so I'll use the pirate_speak tool",
      "action": {
        "tool": "pirate_speak",
        "params": {
          "text": "Hello friend"
        }
      },
      "finalAnswer": "Yarr! Here be yer pirate translation: 'Ahoy, me hearty!'"
    }

    6. Search tool request:
    Human: "What are the latest developments in quantum computing?"
    Assistant: {
      "thought": "I should search for recent information about quantum computing developments",
      "action": {
        "tool": "search tool",
        "params": {
          "query": "latest developments quantum computing 2024",
          "num_results": 3
        }
      },
      "finalAnswer": "Based on the search results, recent quantum computing developments include: 
        1) IBM's new 133-qubit processor achieving quantum advantage
        2) Breakthrough in error correction techniques
        3) Google's progress in quantum supremacy experiments.
        These advances are pushing the field closer to practical quantum applications."
    }
    
    Example Response:
    {
      "results": [
        {
          "title": "IBM Unveils 133-Qubit Quantum Processor",
          "link": "https://example.com/ibm-quantum-news",
          "snippet": "IBM announces breakthrough in quantum computing with new 133-qubit processor..."
        },
        {
          "title": "Quantum Error Correction Makes Breakthrough",
          "link": "https://example.com/quantum-error-correction",
          "snippet": "Scientists achieve significant progress in quantum error correction..."
        },
        {
          "title": "Google's Latest Quantum Supremacy Results",
          "link": "https://example.com/google-quantum",
          "snippet": "Google researchers demonstrate new achievements in quantum supremacy..."
        }
      ]
    }
`;

export function generateAgentPrompt(
  toolsDescription: string,
  userQuery: string,
): string {
  return `
    #You are an AI assistant with access to the following tools:

    ${toolsDescription}

    # TOOL USAGE GUIDELINES:

    1. Use the research_pdf_reader tool when:
       - Working with academic or research papers
       - You need to extract detailed information including abstract, authors, and sections
       - The user asks for specific sections or analysis of a research paper
       - You need to reference or quote from a research paper

    2. Use the pdf_reader tool when:
       - Working with general PDF documents (non-research papers)
       - You need a quick overview or summary of a PDF
       - The user wants basic information like page count or word count

    3. Use the wikipedia_search tool ONLY when:
       - The user explicitly asks to search Wikipedia
       - You need to verify specific facts, dates, or details you're uncertain about
       - The question requires current or historical information you might not have

    4. Use the pirate_speak tool ONLY when:
       - The user specifically asks for pirate translation
       - The request includes phrases like "in pirate speak" or "like a pirate"

    5. For all other queries:
       - Use your own knowledge to provide direct answers
       - Be conversational and helpful
       - Only fall back to tools if you're uncertain about information

  
    ## Response format when using a tool:
    {
      "thought": "your reasoning about what to do",
      "action": {
        "tool": "toolName",
        "params": {
          // parameters should be passed as an object matching the tool's schema
          "parameterName": "parameterValue"
        }
      },
      "finalAnswer": "complete response incorporating the tool result or null if not required"
    }

     If you can answer directly without a tool:
     {
       "thought": "your reasoning",
       "action": null,
       "finalAnswer": "your direct response"
     }

    ## Examples:
    ${ExampleToolOutputs}

  Human query: ${userQuery}
   `.trim();
}
