import { createVideoPipeline } from "../services/pipelineService.js"

export const generateFullVideo = async (req, res, next) => {

  try {

    const result = await createVideoPipeline()

    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    next(error)
  }

}